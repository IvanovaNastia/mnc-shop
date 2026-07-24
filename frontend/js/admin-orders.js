const ORDERS_API_URL = 'https://mnc-backend.onrender.com/api/orders';

// Проверяем авторизацию при загрузке страницы
const adminPassword = localStorage.getItem('admin_password');
if (!adminPassword) {
    window.location.href = 'login.html';
} else {
    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.display = 'block';
    });
}

function logout() {
    localStorage.removeItem('admin_password');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', loadAdminOrders);

// 1. Загрузка заказов
async function loadAdminOrders() {
    try {
        const response = await fetch(ORDERS_API_URL, {
            method: 'GET',
            headers: {
                // Кодируем пароль, чтобы не было ошибки ISO-8859-1
                'X-Admin-Password': encodeURIComponent(adminPassword || '')
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('admin_password');
            window.location.href = 'login.html';
            return;
        }

        if (!response.ok) throw new Error('Не вдалося завантажити замовлення');

        const orders = await response.json();
        renderOrdersTable(orders);
    } catch (error) {
        console.error("Помилка при завантаженні:", error);
        const tbody = document.getElementById('admin-orders-list');
        if (tbody) {
            tbody.innerHTML = `<tr><td class="admin-ord-error" colspan="9">Помилка завантаження даних: ${error.message}</td></tr>`;
        }
    }
}

function renderOrdersTable(orders) {
    const tbody = document.getElementById('admin-orders-list');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td class="admin-no-product" colspan="9">Замовлень у базі даних немає</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.slice().reverse().map(order => {
        let totalOrderPrice = 0;

        let itemsHTML = '';
        if (Array.isArray(order.items) && order.items.length > 0) {
            itemsHTML = order.items.map(item => {
                const hasDiscount = item.discount > 0;
                const pricePerUnit = hasDiscount ? item.price * (1 - item.discount / 100) : item.price;
                const count = item.quantity || 1;
                const itemTotalPrice = pricePerUnit * count;
                totalOrderPrice += itemTotalPrice;

                const imgSrc = (item.img && (item.img.startsWith('http') || item.img.startsWith('/')))
                    ? item.img
                    : `/${item.img || ''}`;

                return `
                    <div class="admin-ord-img">
                        <img src="${imgSrc}">
                        <div>
                            <div class="admin-ord-img-title">${item.title}</div>
                            <div class="admin-ord-img-price">${count} шт. x ${pricePerUnit.toFixed(2)} грн</div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            itemsHTML = '<span>Списку товарів немає</span>';
        }

        const orderDate = order.created_at ? order.created_at.replace('T', ' ').substring(0, 19) : 'Невідомо';
        const currentStatus = order.status || 'Новий';

        return `
            <tr>
                <td><strong>#${order.id}</strong></td>
                <td>${order.user_name}</td>
                <td><a href="tel:${order.user_phone}" class="cont-link">${order.user_phone}</a></td>
                <td>${order.user_email}</td>
                <td>${itemsHTML}</td>
                <td>${totalOrderPrice.toFixed(2)} грн</td>
                <td>
                    <select onchange="changeOrderStatus('${order.id}', this.value)" class="admin-ord-choose">
                        <option value="Новий" ${currentStatus === 'Новий' ? 'selected' : ''}>🔥 Новий</option>
                        <option value="В процесі" ${currentStatus === 'В процесі' ? 'selected' : ''}>⏳ В процесі</option>
                        <option value="Виконано" ${currentStatus === 'Виконано' ? 'selected' : ''}>✅ Виконано</option>
                        <option value="Скасовано" ${currentStatus === 'Скасовано' ? 'selected' : ''}>❌ Скасовано</option>
                    </select>
                </td>
                <td>${orderDate}</td>
                <td>
                    <div class="btn-actions">
                        <button class="btn-delete admin-ord-del" onclick="deleteOrder('${order.id}')">Видалити</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 2. Смена статуса
async function changeOrderStatus(orderId, newStatus) {
    try {
        const response = await fetch(`${ORDERS_API_URL}/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Password': encodeURIComponent(adminPassword || '')
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.status === 401) {
            alert("Сесія застаріла. Будь ласка, авторизуйтесь знову.");
            window.location.href = 'login.html';
            return;
        }

        if (response.ok) {
            console.log(`Статус замовлення №${orderId} успішно змінено`);
        } else {
            const errData = await response.json();
            alert(`Помилка зміни статусу: ${errData.detail || 'Щось пішло не так'}`);
        }
    } catch (error) {
        console.error("Помилка запиту:", error);
        alert("Не вдалося зв'язатися з сервером.");
    }
}

// 3. Удаление заказа
async function deleteOrder(id) {
    const isConfirmed = confirm(`Ви впевнені, що хочете видалити замовлення №${id}?`);
    if (!isConfirmed) return;

    try {
        const response = await fetch(`${ORDERS_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'X-Admin-Password': encodeURIComponent(adminPassword || '')
            }
        });

        if (response.status === 401) {
            alert("Сесія застаріла. Будь ласка, авторизуйтесь знову.");
            window.location.href = 'login.html';
            return;
        }

        if (response.ok) {
            alert('Замовлення успішно видалено!');
            loadAdminOrders();
        } else {
            const errData = await response.json();
            alert(`Помилка сервера при видаленні: ${errData.detail || 'Код відповіді не OK'}`);
        }
    } catch (error) {
        console.error("Критична помилка при видаленні:", error);
        alert(`Не вдалося надіслати запит на видалення.`);
    }
}