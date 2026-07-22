const ADMIN_API_URL = 'https://mnc-backend.onrender.com/api/products';

// --- НАДЕЖНАЯ ПРОВЕРКА АВТОРИЗАЦИИ ---
const adminPassword = localStorage.getItem('admin_password');
if (!adminPassword) {
    window.location.href = 'login.html';
} else {
    document.addEventListener('DOMContentLoaded', () => {
        document.body.style.display = 'block';
    });
}

function logout() {
    localStorage.removeItem('admin_password'); // Стираем пароль из памяти
    window.location.href = 'login.html';       // Выкидываем на страницу входа
}

// Загружаем товары при открытии страницы
document.addEventListener('DOMContentLoaded', loadAdminProducts);

async function loadAdminProducts() {
    try {
        // Эндпоинт GET /api/products открытый, но мы можем отправлять заголовок для единообразия
        const response = await fetch(ADMIN_API_URL);
        const products = await response.json(); // Считываем JSON ровно один раз
        
        window.allProducts = products; // Сохраняем данные для редактирования
        renderAdminTable(products);     // Отрисовываем таблицу
    } catch (error) {
        console.error("Помилка завантаження товарів для адмінки:", error);
    }
}

function renderAdminTable(products) {
    const tbody = document.getElementById('admin-products-list');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td class="admin-no-product" colspan="11">Товарів у базі даних немає</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map((item, index) => {
        const hasDiscount = item.discount > 0;
        const finalPrice = hasDiscount ? item.price * (1 - item.discount / 100) : item.price;

        // Проверяем строго свойство item.category, которое пришло из SQLite
        let categoriesHTML = '';
        if (Array.isArray(item.category) && item.category.length > 0) {
            categoriesHTML = item.category.map(cat => `<div>• ${cat}</div>`).join('');
        } else {
            categoriesHTML = 'Немає';
        }

        let specsHTML = '';
        if (item.specs && typeof item.specs === 'object') {
            specsHTML = Object.entries(item.specs)
                .map(([key, value]) => `<div><strong>${key}:</strong> ${value}</div>`)
                .join('');
        } else {
            specsHTML = 'Немає';
        }

        return `
            <tr>
                <td><strong>${item.id}</strong></td>
                <td class="admin-img"><img src="${item.img}" alt="${item.title}"></td>
                <td>${item.title}</td>
                <td>${item.price.toFixed(2)} грн</td>
                <td>${item.discount > 0 ? `-${item.discount}%` : 'Немає'}</td>
                <td>${item.discount > 0 ? (finalPrice.toFixed(2) + ' грн') : 'Немає'}</td>
                <td>${item.isNew ? '✅ Так' : '❌ Ні'}</td>
                <td>${item.isPopular ? '✅ Так' : '❌ Ні'}</td>
                <td>${categoriesHTML}</td>
                <td>${item.description || 'Немає'}</td>
                <td>${specsHTML}</td>
                <td>
                    <div class="btn-actions">
                        <button class="btn-edit" onclick="editProduct(${item.id})">Редагувати</button>
                        <button class="btn-delete" onclick="deleteProduct(${item.id})">Видалити</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Функция подготовки к редактированию
async function editProduct(id) {
    try {
        if (!window.allProducts) return;
        
        const item = window.allProducts.find(p => p.id === id);
        if (!item) {
            alert("Товар не знайдено в локальному списку");
            return;
        }

        // 1. Меняем заголовок модалки и устанавливаем скрытый ID
        document.getElementById('modalTitle').textContent = `Редагувати товар (ID: ${item.id})`;
        document.getElementById('form-product-id').value = item.id;

        // 2. Заполняем основные поля
        document.getElementById('form-title').value = item.title;
        document.getElementById('form-price').value = item.price;
        document.getElementById('form-discount').value = item.discount;
        document.getElementById('form-description').value = item.description || '';

        // Для картинок при редактировании сохраняем старый путь в скрытое поле
        document.getElementById('form-img-old-path').value = item.img;
        // И убираем обязательность загрузки нового файла
        document.getElementById('form-img-file').required = false;

        // 3. Расставляем чекбоксы категорий
        const checkboxes = document.querySelectorAll('input[name="categories"]');
        checkboxes.forEach(cb => {
            cb.checked = Array.isArray(item.category) && item.category.includes(cb.value);
        });

        // 4. Заполняем "Особисте"
        document.getElementById('form-isNew').checked = !!item.isNew;
        document.getElementById('form-isPopular').checked = !!item.isPopular;

        // 5. Заполняем характеристики
        const specsContainer = document.getElementById('specs-container');
        specsContainer.innerHTML = ''; 
        
        if (item.specs && typeof item.specs === 'object') {
            Object.entries(item.specs).forEach(([key, value]) => {
                const row = document.createElement('div');
                row.className = 'spec-dynamic-row';
                row.style.display = 'flex';
                row.style.gap = '10px';
                row.style.marginBottom = '8px';
                row.innerHTML = `
                    <input type="text" value="${key}" class="spec-key" required>
                    <input type="text" value="${value}" class="spec-value" required>
                    <button type="button" class="btn-remove-spec" onclick="this.parentElement.remove()">✕</button>
                `;
                specsContainer.appendChild(row);
            });
        }

        // Открываем модалку
        document.getElementById('addProductModal').style.display = 'flex';

    } catch (error) {
        console.error("Помилка при підготовці редагування:", error);
    }
}

// --- ИСПРАВЛЕНО: УДАЛЕНИЕ С ЗАГОЛОВКОМ АВТОРИЗАЦИИ ---
async function deleteProduct(id) {
    const isConfirmed = confirm(`Ви впевнені, що хочете видалити товар з ID ${id}?`);
    if (!isConfirmed) return;

    try {
        const response = await fetch(`${ADMIN_API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'X-Admin-Password': adminPassword // Передаем секретный пароль
            }
        });

        if (response.status === 401) {
            alert("Сесія застаріла або невірна. Будь ласка, увійдіть знову.");
            localStorage.removeItem('admin_password');
            window.location.href = 'login.html';
            return;
        }

        if (response.ok) {
            alert('Товар успішно видалено!');
            loadAdminProducts();
        } else {
            const errorData = await response.json();
            alert(`Помилка видаления: ${errorData.detail || 'Щось пішло не так'}`);
        }
    } catch (error) {
        console.error("Помилка при видаленні товару:", error);
    }
}

// Элементы модального окна
const modal = document.getElementById('addProductModal');
const openModalBtn = document.getElementById('openAddModalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const addProductForm = document.getElementById('addProductForm');

// Открытие модалки
if (openModalBtn) {
    openModalBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });
}

// Сброс модального окна в начальное состояние
function resetModalState() {
    modal.style.display = 'none';
    if (addProductForm) addProductForm.reset();
    document.getElementById('modalTitle').textContent = 'Додати новий товар';
    document.getElementById('form-product-id').value = '';
    document.getElementById('specs-container').innerHTML = '';
    
    // Возвращаем обязательность выбора файла для новых товаров
    const fileInput = document.getElementById('form-img-file');
    if (fileInput) fileInput.required = true;
    
    const oldPathInput = document.getElementById('form-img-old-path');
    if (oldPathInput) oldPathInput.value = '';
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', resetModalState);
}

window.addEventListener('click', (e) => {
    if (e.target === modal) resetModalState();
});

// Инициализация формы (с поддержкой авторизации и POST/PUT)
if (addProductForm) {
    addProductForm.replaceWith(addProductForm.cloneNode(true));
    const freshForm = document.getElementById('addProductForm');

    freshForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('form-img-file');
        const oldImagePath = document.getElementById('form-img-old-path').value;
        let finalImgPath = oldImagePath || 'img/products/aaa.png'; // Заглушка по умолчанию

        // 1. ИСПРАВЛЕНО: Загрузка файла картинки на сервер с заголовком авторизации
        if (fileInput && fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            try {
                const uploadResponse = await fetch('https://mnc-backend.onrender.com/api/upload', {
                    method: 'POST',
                    headers: {
                        'X-Admin-Password': adminPassword // Передаем пароль для загрузки изображений
                    },
                    body: formData
                });

                if (uploadResponse.status === 401) {
                    alert("Сесія застаріла. Будь ласка, увійдіть знову.");
                    localStorage.removeItem('admin_password');
                    window.location.href = 'login.html';
                    return;
                }

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    finalImgPath = uploadResult.img_url; 
                } else {
                    alert("Помилка при завантаженні картинки на сервер");
                    return; 
                }
            } catch (err) {
                console.error("Помилка загрузки фото:", err);
                alert("Не вдалося завантажити фото");
                return;
            }
        }

        // 2. Собираем чекбоксы категорий
        const checkedCategories = Array.from(document.querySelectorAll('input[name="categories"]:checked'))
            .map(cb => cb.value);

        // 3. Собираем кастомные характеристики
        const specsObj = {};
        const rows = document.querySelectorAll('.spec-dynamic-row');
        rows.forEach(row => {
            const key = row.querySelector('.spec-key').value.trim();
            const val = row.querySelector('.spec-value').value.trim();
            if (key && val) specsObj[key] = val;
        });

        // 4. Формируем единый объект данных
        const productData = {
            title: document.getElementById('form-title').value.trim(),
            price: parseFloat(document.getElementById('form-price').value),
            discount: parseInt(document.getElementById('form-discount').value) || 0,
            img: finalImgPath, 
            category: checkedCategories,
            isNew: document.getElementById('form-isNew').checked,
            isPopular: document.getElementById('form-isPopular').checked,
            description: document.getElementById('form-description').value.trim(),
            specs: specsObj
        };

        const editId = document.getElementById('form-product-id').value;
        let url = ADMIN_API_URL;
        let method = 'POST';

        if (editId) {
            url = `${ADMIN_API_URL}/${editId}`;
            method = 'PUT';
        }

        try {
            // --- ИСПРАВЛЕНО: ОТПРАВКА ДАННЫХ ТОВАРА С ЗАГОЛОВКОМ АВТОРИЗАЦИИ ---
            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Admin-Password': adminPassword // Передаем секретный пароль
                },
                body: JSON.stringify(productData)
            });

            if (response.status === 401) {
                alert("Сесія застаріла. Будь ласка, увійдіть знову.");
                localStorage.removeItem('admin_password');
                window.location.href = 'login.html';
                return;
            }

            if (response.ok) {
                alert(editId ? 'Товар успішно оновлено!' : 'Товар успішно додано!');
                resetModalState();
                loadAdminProducts();
            } else {
                const errorData = await response.json();
                alert(`Помилка: ${errorData.detail || 'Не вдалося зберегти зміни'}`);
            }
        } catch (error) {
            console.error("Помилка при збереженні товару:", error);
            alert("Не вдалося зв'язатися з сервером.");
        }
    });
}

// Оживляем кнопку характеристик (Делегирование событий)
document.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'btn-add-spec-row') {
        const specsContainer = document.getElementById('specs-container');
        if (specsContainer) {
            const row = document.createElement('div');
            row.className = 'spec-dynamic-row';
            row.style.display = 'flex';
            row.style.gap = '10px';
            row.style.marginBottom = '8px';
            row.innerHTML = `
                <input type="text" placeholder="Назва (напр. Вага)" class="spec-key" required>
                <input type="text" placeholder="Значення" class="spec-value" required>
                <button type="button" class="btn-remove-spec" onclick="this.parentElement.remove()">✕</button>
            `;
            specsContainer.appendChild(row);
        }
    }
});