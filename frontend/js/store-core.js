const CORE_API_URL = 'https://mnc-backend.onrender.com/api/products';

let cart = JSON.parse(localStorage.getItem('shop_cart')) || [];
let favourite = JSON.parse(localStorage.getItem('favourite')) || [];

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderCounters();

    if (window.location.pathname.includes('product.html')) {
        renderSingleProductPage();
    }

    if (document.querySelector('.cart-menu') || document.getElementById('shop_cart')) {
        renderCartPage();
    }

    if (document.querySelector('.fav-menu') || document.getElementById('favourite')) {
        renderFavPage();
    }
});

function updateHeaderCounters() {
    const favBadge = document.getElementById('fav-counter-badge');
    const cartBadge = document.getElementById('cart-counter-badge');

    // 1. Обновление счетчика Избранного
    if (favBadge) {
        const favCount = favourite.length;
        if (favCount > 0) {
            favBadge.textContent = favCount;
            favBadge.style.display = 'flex';
        } else {
            favBadge.style.display = 'none';
        }
    }

    // 2. Обновление счетчика Корзины
    if (cartBadge) {
        const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        if (cartCount > 0) {
            cartBadge.textContent = cartCount;
            cartBadge.style.display = 'flex';
        } else {
            cartBadge.style.display = 'none';
        }
    }
}

window.addToCart = async function (id) {
    try {
        const response = await fetch(`${CORE_API_URL}`);
        const products = await response.json();
        const product = products.find(p => p.id === id);

        if (!product) return;

        const cartItem = cart.find(item => item.id === id);
        if (cartItem) {
            cartItem.quantity += 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }

        localStorage.setItem('shop_cart', JSON.stringify(cart));
        updateHeaderCounters();

        if (document.querySelector('.cart-menu')) renderCartPage();
    } catch (e) {
        console.error("Не вдалося додати товар до кошика", e);
    }
};

window.addToFav = async function (id) {
    try {
        const response = await fetch(`${CORE_API_URL}`);
        const products = await response.json();
        const product = products.find(p => p.id === id);

        if (!product) return;

        if (!favourite.some(item => item.id === id)) {
            favourite.push(product);
            localStorage.setItem('favourite', JSON.stringify(favourite));
            updateHeaderCounters();
        }
    } catch (e) {
        console.error("Не вдалося додати товар до обраного", e);
    }
};

// ОТОБРАЖЕНИЕ СТРАНИЦЫ ОДНОГО ТОВАРА (Загрузка описания и характеристик из JSON бэкенда)
async function renderSingleProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));
    if (!productId) return;

    try {
        const response = await fetch(`${CORE_API_URL}`);
        const products = await response.json();
        const product = products.find(p => p.id === productId);

        if (!product) return;

        const imgSrc = (product.img && (product.img.startsWith('http') || product.img.startsWith('/')))
            ? product.img
            : `/${product.img || ''}`;

        const productShow = document.querySelector('.product-show');
        const productDescr = document.querySelector('.product-descr');

        const hasDiscount = product.discount > 0;
        const finalPrice = hasDiscount ? (product.price * (1 - product.discount / 100)).toFixed(2) : product.price.toFixed(2);

        let badgeHTML = hasDiscount ? `<div class="badge badge-sale">-${product.discount}%</div>` : '';

        if (productShow) {
            productShow.innerHTML = `
                <div class="show-img">
                    ${badgeHTML}
                    <img src="${imgSrc}" alt="${product.title}">
                </div>
                <div class="show-info">
                    <div class="show-text">
                        <h1>${product.title}</h1>
                        ${hasDiscount ?
                    `<div class="show-price product-price-old show-price-old">${product.price.toFixed(2)} грн</div>
                     <div class="show-price price-sale show-price-sale">${finalPrice} грн</div>`
                    : `<div>${finalPrice} грн</div>`}
                    </div>
                    <div class="show-btn">
                        <button class="btn-fav" onclick="addToFav(${product.id})">В обране</button>
                        <button class="btn-cart" onclick="addToCart(${product.id})">В кошик</button>
                    </div>
                </div>
            `;
        }

        if (productDescr) {
            const descriptionText = product.description || "Опис товару найближчим часом з'явиться на сайті.";

            // Рендеринг объекта характеристик (specs) из вашего .json файла
            let specsHTML = "";
            if (product.specs && Object.keys(product.specs).length > 0) {
                specsHTML = "<ul>";
                for (let key in product.specs) {
                    specsHTML += `<li><strong>${key}:</strong> ${product.specs[key]}</li>`;
                }
                specsHTML += "</ul>";
            } else {
                specsHTML = `
                    <div>Статус: ${product.isNew ? 'Новинка' : 'Стандарт'}</div>
                    <div>Популярний: ${product.isPopular ? 'Так' : 'Ні'}</div>
                    <div>Категорії: ${product.category ? product.category.join(', ') : 'Загальна'}</div>
                `;
            }

            productDescr.innerHTML = `
                <div>
                    <h1>Опис товару</h1>
                    <div class="descr-content">${descriptionText}</div>
                </div>
                <div>
                    <h1>Характеристика товару</h1>
                    <div class="specs-content">${specsHTML}</div>
                </div>
            `;
        }
    } catch (e) {
        console.error("Помилка завантаження сторінки товару", e);
    }
}

// КОРЗИНА (КЛИК ПО ВСЕМУ БОКСУ)
function renderCartPage() {
    const cartMenu = document.querySelector('.cart-menu');
    const asideContainer = document.querySelector('.aside-menu');

    if (!cartMenu) return;

    if (cart.length === 0) {
        cartMenu.innerHTML = '<div class="empty-message">Ваш кошик порожній</div>';
        if (asideContainer) asideContainer.style.display = 'none';
        return;
    }

    if (asideContainer) asideContainer.style.display = 'block';

    cartMenu.innerHTML = cart.map(item => {
        const imgSrc = (item.img && (item.img.startsWith('http') || item.img.startsWith('/')))
            ? item.img
            : `/${item.img || ''}`;

        const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)) : item.price;
        return `
            <div class="cart-card" onclick="window.location.href='product.html?id=${item.id}'">
                <div class="cart-info">
                    <div class="cart-img">
                        <img src="${imgSrc}" alt="${item.title}">
                    </div>
                    <div class="cart-text">
                        <h2 class="text-title">${item.title}</h2>
                        <div class="text-price">${(finalPrice * item.quantity).toFixed(2)} грн (${item.quantity} шт.)</div>
                    </div>
                </div>
                <div class="cart-del">
                    <button onclick="event.stopPropagation(); removeFromCart(${item.id})">
                        <img src="img/mini-pin/trash.svg" alt="Видалити">
                    </button>
                </div>
            </div>
        `;
    }).join('');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => {
        const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)) : item.price;
        return sum + (finalPrice * item.quantity);
    }, 0);

    if (asideContainer) {
        asideContainer.innerHTML = `
            <div class="aside-container">
                <h2 class="aside-title">Підсумок замовлення</h2>
                <div class="aside-info">
                    <div>Товари</div>
                    <div>${totalItems}</div>
                </div>
                <div class="aside-pay">
                    <div>До оплати</div>
                    <div>${totalPrice.toFixed(2)} грн</div>
                </div>
                <button class="aside-btn" id="checkout-btn">Оформити заказ</button>
            </div>
        `;
    }
}

window.removeFromCart = function (id) {
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('shop_cart', JSON.stringify(cart));
    renderCartPage();
    updateHeaderCounters();
};

// ИЗБРАННОЕ (КЛИК ПО ВСЕМУ БОКСУ)
function renderFavPage() {
    const favMenu = document.querySelector('.fav-menu');
    if (!favMenu) return;

    if (favourite.length === 0) {
        favMenu.innerHTML = '<div class="empty-message">У вас немає вибраних товарів</div>';
        return;
    }

    favMenu.innerHTML = favourite.map(item => {
        const imgSrc = (item.img && (item.img.startsWith('http') || item.img.startsWith('/')))
            ? item.img
            : `/${item.img || ''}`;

        const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)) : item.price;
        return `
            <div class="fav-card" onclick="window.location.href='product.html?id=${item.id}'">
                <div class="fav-info">
                    <div class="fav-img">
                        <img src="${imgSrc}" alt="${item.title}">
                    </div>
                    <div class="fav-text">
                        <h2 class="text-title">${item.title}</h2>
                        <div class="text-price">${finalPrice.toFixed(2)} грн</div>
                    </div>
                </div>
                <div class="fav-btn">
                    <button class="fav-del" onclick="event.stopPropagation(); removeFromFav(${item.id})">
                        <img src="img/mini-pin/trash.svg" alt="Видалити">
                    </button>
                    <button class="fav-cart" onclick="event.stopPropagation(); moveFromFavToCart(${item.id})">
                        <img src="img/header/cart.svg" alt="В кошик">
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

window.removeFromFav = function (id) {
    favourite = favourite.filter(item => item.id !== id);
    localStorage.setItem('favourite', JSON.stringify(favourite));
    renderFavPage();
    updateHeaderCounters();
};

window.moveFromFavToCart = function (id) {
    addToCart(id);
    favourite = favourite.filter(item => item.id !== id);
    localStorage.setItem('favourite', JSON.stringify(favourite));
    renderFavPage();
    updateHeaderCounters();
};


// --- ЛОГИКА ОТКРЫТИЯ МОДАЛЬНЫХ ОКОН ---
// Используем делегирование кликов, чтобы кнопка "Оформити заказ" работала всегда,
// даже после того, как корзина полностью перерисовывается.
document.addEventListener('click', (e) => {
    const orderModal = document.getElementById('orderModal');
    const successModal = document.getElementById('successModal');

    // Клик по кнопке "Оформити заказ"
    if (e.target && e.target.id === 'checkout-btn') {
        orderModal.style.display = 'flex';
    }

    if (e.target && e.target.classList.contains('close-modal')) {
        orderModal.style.display = 'none';
    }

    // Клик по кнопке "ОК" в окне успешного заказа
    if (e.target && e.target.id === 'successCloseBtn') {
        successModal.style.display = 'none';
        renderCartPage();
    }
});

document.addEventListener('submit', function (e) {
    const orderModal = document.getElementById('orderModal');

    if (e.target && (e.target.id === 'orderForm' || e.target.closest('#orderModal'))) {
        e.preventDefault();

        const form = e.target;
        
        const nameInput = form.querySelector('[name="userName"]') || document.getElementById('userName');
        const emailInput = form.querySelector('[name="userEmail"]') || document.getElementById('userEmail');
        const phoneInput = form.querySelector('[name="userPhone"]') || document.getElementById('userPhone');

        if (!nameInput || !emailInput || !phoneInput) {
            alert("Сталася технічна помилка: не знайдено поля форми.");
            return false;
        }

        let isValid = true;

        function showError(input, message) {
            const group = input.parentElement;
            const errorSpan = group.querySelector('.error-message');
            input.classList.add('invalid');
            group.classList.add('has-error');
            if (errorSpan) errorSpan.innerHTML = message;
            isValid = false;
        }

        function clearError(input) {
            const group = input.parentElement;
            input.classList.remove('invalid');
            group.classList.remove('has-error');
        }

        // Валидация
        clearError(nameInput);
        const nameValue = nameInput.value.trim();
        if (!nameValue || nameValue.length < 3) {
            showError(nameInput, "Будь ласка, введіть коректне ім'я.");
        }

        clearError(emailInput);
        const emailValue = emailInput.value.trim();
        if (!emailValue || !emailValue.includes('@')) {
            showError(emailInput, "Некоректний формат email.");
        }

        clearError(phoneInput);
        const phoneValue = phoneInput.value.trim();
        if (!phoneValue) {
            showError(phoneInput, "Будь ласка, введіть телефон.");
        }

        if (!isValid) return false;

        // Берём данные напрямую из localStorage, чтобы не трогать глобальный массив cart напрямую
        const itemsToSend = JSON.parse(localStorage.getItem('shop_cart')) || [];

        const orderData = {
            name: nameValue,
            email: emailValue,
            phone: phoneValue,
            items: itemsToSend
        };

        fetch('https://mnc-backend.onrender.com/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        })
            .then(response => {
                if (!response.ok) throw new Error('Помилка сервера: ' + response.status);
                return response.json();
            })
            .then(() => {
                if (orderModal) orderModal.style.display = 'none';
                form.reset();
                localStorage.removeItem('shop_cart');
                cart = [];
                updateHeaderCounters();

                const successModal = document.getElementById('successModal');
                if (successModal) {
                    successModal.style.display = 'flex';
                } else {
                    alert("Дякуємо! Ваше замовлення прийнято.");
                }
            })
            .catch(error => {
                console.error("Помилка при отправці:", error);
                alert("Не вдалося відправити замовлення.");
            });

        return false;
    }
});

// Привязываем функции к window, чтобы SPA-роутер мог вызывать их при смене страниц
window.updateHeaderCounters = updateHeaderCounters;
window.renderSingleProductPage = renderSingleProductPage;
window.renderCartPage = renderCartPage;
window.renderFavPage = renderFavPage;