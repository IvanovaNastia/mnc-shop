var CORE_API_URL = window.CORE_API_URL || 'https://mnc-backend.onrender.com/api/products';
var BACKEND_URL = window.BACKEND_URL || 'https://mnc-backend.onrender.com';

function getImageUrl(path) {
    if (!path) return 'img/no-image.png'; // Заглушка, если путь отсутствует

    // Если путь начинается с http/https (полный URL)
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Если путь загруженного файла с админки (начинается с /uploads/)
    if (path.startsWith('/uploads/')) {
        return `${BACKEND_URL}${path}`;
    }

    // Если путь относительный без слэша в начале (например, uploads/aaa.webp)
    if (path.startsWith('uploads/')) {
        return `${BACKEND_URL}/${path}`;
    }

    // Для статических картинок проекта из папки img/
    return path.startsWith('/') ? path : `/${path}`;
}

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

// ОТОБРАЖЕНИЕ СТРАНИЦЫ ОДНОГО ТОВАРА
async function renderSingleProductPage() {
    const params = new URLSearchParams(window.location.search);
    const productId = parseInt(params.get('id'));

    if (!productId) {
        window.location.href = 'index.html';
        return;
    }

    const products = await loadProducts();
    const product = products.find(p => p.id === productId);

    if (!product) {
        window.location.href = 'index.html';
        return;
    }

    // 1. Заполняем основные данные текущего товара
    const mainImg = document.getElementById('main-product-img');
    const titleEl = document.getElementById('product-title');
    const priceEl = document.getElementById('product-price');
    const descEl = document.getElementById('product-desc');
    const fullDescEl = document.getElementById('product-full-desc');
    const charList = document.getElementById('product-char-list');

    if (mainImg) mainImg.src = getImageUrl(product.img);
    if (titleEl) titleEl.innerText = product.title;
    if (descEl) descEl.innerText = product.description || '';
    if (fullDescEl) fullDescEl.innerText = product.fullDescription || product.description || '';

    // Расчет цены со скидкой
    if (priceEl) {
        const finalPrice = product.discount > 0 
            ? (product.price * (1 - product.discount / 100)).toFixed(2) 
            : product.price.toFixed(2);
        priceEl.innerText = `${finalPrice} грн`;
    }

    // Заполнение характеристик
    if (charList && product.characteristics) {
        charList.innerHTML = Object.entries(product.characteristics)
            .map(([key, val]) => `<li><strong>${key}:</strong> ${val}</li>`)
            .join('');
    }

    // Настройка кнопок действий
    const btnCart = document.getElementById('btn-add-cart');
    const btnFav = document.getElementById('btn-add-fav');

    if (btnCart) btnCart.onclick = () => addToCart(product.id);
    if (btnFav) btnFav.onclick = () => addToFav(product.id);

    // -------------------------------------------------------------
    // 2. Логика для рендера «Схожих товарів»
    // -------------------------------------------------------------
    const similarGrid = document.getElementById('similar-products-grid');
    if (similarGrid && product.category) {
        // Фильтруем товары: та же категория, но исключаем сам открытый товар
        const similarProducts = products
            .filter(p => p.category === product.category && p.id !== product.id)
            .slice(0, 4); // Берем максимум 4 штуки

        if (similarProducts.length > 0) {
            similarGrid.innerHTML = similarProducts.map(p => {
                const imgSrc = getImageUrl(p.img);
                const finalPrice = p.discount > 0 
                    ? (p.price * (1 - p.discount / 100)).toFixed(2) 
                    : p.price.toFixed(2);

                return `
                    <div class="product-card" onclick="location.href='product.html?id=${p.id}'">
                        <div class="product-img">
                            <img src="${imgSrc}" alt="${p.title}">
                        </div>
                        <div class="product-title">${p.title}</div>
                        <div class="product-info">
                            <div class="show-price">${finalPrice} грн</div>
                        </div>
                        <div class="product-btn" onclick="event.stopPropagation()">
                            <button class="btn-fav" onclick="addToFav(${p.id})">В обране</button>
                            <button class="btn-cart" onclick="addToCart(${p.id})">В кошик</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            similarGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">Схожих товарів не знайдено</p>';
        }
    }
}

// КОРЗИНА (КЛИК ПО ВСЕМУ БОКСУ)
function renderCartPage() {
    const cartMenu = document.querySelector('.cart-menu');
    const asideMenu = document.querySelector('.aside-menu');

    if (!cartMenu) return;

    if (cart.length === 0) {
        cartMenu.innerHTML = '<div class="empty-message">Ваш кошик порожній</div>';
        if (asideMenu) asideMenu.style.display = 'none';
        return;
    }

    if (asideMenu) asideMenu.style.display = 'block';

    cartMenu.innerHTML = cart.map(item => {
        const imgSrc = getImageUrl(item.img);
        const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)) : item.price;
        
        return `
            <div class="cart-card" onclick="goToProduct(${item.id})">
                <div class="cart-info">
                    <div class="cart-img">
                        <img src="${imgSrc}" alt="${item.title}">
                    </div>
                    <div class="cart-text">
                        <h2 class="text-title">${item.title}</h2>
                        <div class="text-price">${(finalPrice * item.quantity).toFixed(2)} грн</div>
                        
                        <!-- Счетчик количества -->
                        <div class="cart-qty-counter" onclick="event.stopPropagation()">
                            <button class="cart-qty-btn" onclick="changeCartQty(${item.id}, -1)">−</button>
                            <input type="number" class="cart-qty-input" value="${item.quantity}" readonly>
                            <button class="cart-qty-btn" onclick="changeCartQty(${item.id}, 1)">+</button>
                        </div>
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

    const MIN_ORDER_AMOUNT = 500;
    const isMinAmountReached = totalPrice >= MIN_ORDER_AMOUNT;

    if (asideMenu) {
        asideMenu.innerHTML = `
            <div class="aside-container">
                <h2 class="aside-title">Підсумок замовлення</h2>
                <div class="aside-info">
                    <div>Товари (${totalItems} шт.)</div>
                    <div>${totalPrice.toFixed(2)} грн</div>
                </div>
                <div class="aside-pay">
                    <div>До оплати</div>
                    <div>${totalPrice.toFixed(2)} грн</div>
                </div>
                <button class="aside-btn" id="checkout-btn" ${!isMinAmountReached ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
                    Оформити заказ
                </button>
            </div>
        `;
    }
}

// Изменение количества товара в корзине (+ / -)
window.changeCartQty = function (id, delta) {
    const item = cart.find(product => product.id === id);
    if (!item) return;

    item.quantity = (item.quantity || 1) + delta;

    // Если количество стало <= 0, удаляем товар из корзины
    if (item.quantity <= 0) {
        removeFromCart(id);
        return;
    }

    localStorage.setItem('shop_cart', JSON.stringify(cart));
    renderCartPage();
    updateHeaderCounters();
};

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
        const imgSrc = getImageUrl(item.img);

        const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)) : item.price;
        return `
            <div class="fav-card" onclick="goToProduct(${item.id})">
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


// --- ЛОГИКА ОТКРЫТИЯ И ВАЛИДАЦИИ МОДАЛЬНЫХ ОКОН ---
document.addEventListener('click', (e) => {
    const orderModal = document.getElementById('orderModal');
    const successModal = document.getElementById('successModal');

    // Клик по кнопке "Оформити заказ"
    if (e.target && e.target.id === 'checkout-btn') {
        const totalPrice = cart.reduce((sum, item) => {
            const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)) : item.price;
            return sum + (finalPrice * item.quantity);
        }, 0);

        if (totalPrice < 500) {
            alert("Мінімальна сума замовлення складає 500 грн.");
            return;
        }

        if (orderModal) {
            orderModal.style.display = 'flex';
        } else {
            console.error("Помилка: елемент #orderModal не знайдено на цій сторінці.");
        }
    }

    // Закрытие крестиком
    if (e.target && e.target.classList.contains('close-modal')) {
        if (orderModal) orderModal.style.display = 'none';
        if (successModal) successModal.style.display = 'none';
    }

    // Клик по кнопке "ОК" в окне успешного заказа
    if (e.target && e.target.id === 'successCloseBtn') {
        if (successModal) successModal.style.display = 'none';
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
                console.error("Помилка при відправці:", error);
                alert("Не вдалося відправити замовлення.");
            });

        return false;
    }
});

// Привязываем функции к window
window.updateHeaderCounters = updateHeaderCounters;
window.renderSingleProductPage = renderSingleProductPage;
window.renderCartPage = renderCartPage;
window.renderFavPage = renderFavPage;