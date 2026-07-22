const API_URL = 'https://mnc-backend.onrender.com/api/products';

// Глобальная функция инициализации для SPA-роутера и обычного DOMContentLoaded
async function initCatalogPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const category = urlParams.get('category');
    const searchQuery = urlParams.get('search');

    const titleElement = document.getElementById('title');
    const gridElement = document.getElementById('product-grid');

    // Настройка ссылок в каталоге
    const catalogLinks = document.querySelectorAll('.catalog-list a');
    catalogLinks.forEach(link => {
        const categoryName = link.textContent.trim();
        if (categoryName === "Всі товари") {
            link.href = "special.html?type=all";
        } else {
            link.href = `special.html?category=${encodeURIComponent(categoryName)}`;
        }
    });

    // Настройка кнопки баннера
    const bannerBtn = document.querySelector('.banner-action-btn');
    if (bannerBtn) {
        bannerBtn.onclick = () => {
            window.location.href = "special.html?type=all";
        };
    }

    // --- ОБЩАЯ ЗАГРУЗКА ДАННЫХ ДЛЯ ВСЕХ СТРАНИЦ ---
    // Определяем контейнеры главной страницы
    const newContainer = document.getElementById('new-products-grid');
    const popularContainer = document.getElementById('popular-products-grid');
    const saleContainer = document.getElementById('sale-products-grid');

    // Делаем запрос к серверу, если мы на странице каталога или на главной
    if ((gridElement && titleElement) || newContainer || popularContainer || saleContainer) {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Ошибка загрузки данных с сервера');

            const products = await response.json();

            // Логика для страницы КАТАЛОГА (special.html)
            if (gridElement && titleElement) {
                let filteredProducts = [];
                let pageTitle = "Товари";

                if (searchQuery) {
                    const query = searchQuery.trim().toLowerCase();
                    pageTitle = `Результати пошуку: "${searchQuery}"`;

                    filteredProducts = products.filter(p =>
                        (p.title && p.title.toLowerCase().includes(query)) ||
                        (p.description && p.description.toLowerCase().includes(query))
                    );
                } else if (type === 'new') {
                    pageTitle = "Новинки";
                    filteredProducts = products.filter(p => p.isNew);
                } else if (type === 'popular') {
                    pageTitle = "Популярні товари";
                    filteredProducts = products.filter(p => p.isPopular);
                } else if (type === 'sale') {
                    pageTitle = "Акції та знижки";
                    filteredProducts = products.filter(p => p.discount > 0);
                } else if (type === 'all') {
                    pageTitle = "Всі товари";
                    filteredProducts = [...products];
                } else if (category) {
                    pageTitle = category;
                    filteredProducts = products.filter(p => p.category && p.category.includes(category));
                } else {
                    pageTitle = "Каталог товарів";
                    filteredProducts = [...products];
                }

                titleElement.textContent = pageTitle;
                renderProductGrid(filteredProducts, gridElement, type);
            }

            // Логика для ГЛАВНОЙ СТРАНИЦЫ (index.html)
            // 1. Блок НОВИНКИ (Передаем третий параметр 'new')
            if (newContainer) {
                newContainer.innerHTML = '';
                const newProducts = products.filter(item => item.isNew).slice(0, 4);
                newProducts.forEach(item => renderCard(item, newContainer, 'new'));
            }

            // 2. Блок ПОПУЛЯРНОЕ (Передаем третий параметр 'popular')
            if (popularContainer) {
                popularContainer.innerHTML = '';
                const popularProducts = products.filter(item => item.isPopular).slice(0, 4);
                popularProducts.forEach(item => renderCard(item, popularContainer, 'popular'));
            }

            // 3. Блок СКИДКИ (Передаем третий параметр 'sale')
            if (saleContainer) {
                saleContainer.innerHTML = '';
                const saleProducts = products.filter(item => item.discount > 0).slice(0, 4);
                saleProducts.forEach(item => renderCard(item, saleContainer, 'sale'));
            }

        } catch (error) {
            console.error('Ошибка:', error);
            if (gridElement) {
                gridElement.innerHTML = '<div class="empty-message">Не вдалося завантажити товари. Спробуйте пізніше.</div>';
            }
        }
    }
}

// Привязываем к window, чтобы SPA-роутер гарантированно видел функцию
window.initCatalogPage = initCatalogPage;

// Первый запуск при полной загрузке HTML
document.addEventListener('DOMContentLoaded', initCatalogPage);

// Функция отрисовки для каталога (special.html)
function renderProductGrid(productsList, container, currentType) {
    container.innerHTML = '';

    if (productsList.length === 0) {
        container.innerHTML = '<div class="empty-message">Наразі немає товарів у цій категории.</div>';
        return;
    }

    productsList.forEach(item => {
        const imgSrc = (item.img && (item.img.startsWith('http') || item.img.startsWith('/')))
            ? item.img
            : `/${item.img || ''}`;

        const hasDiscount = item.discount > 0;
        const finalPrice = hasDiscount ? (item.price * (1 - item.discount / 100)).toFixed(2) : item.price.toFixed(2);

        let badgeHTML = '';
        if (currentType === 'new') {
            badgeHTML = `<div class="badge badge-new">NEW</div>`;
        } else if (hasDiscount) {
            badgeHTML = `<div class="badge badge-sale">-${item.discount}%</div>`;
        }

        let priceHTML = hasDiscount ? `
            <div class="product-price-old">${item.price.toFixed(2)} грн</div>
            <div class="product-price price-sale">${finalPrice} грн</div>
        ` : `<div class="product-price">${finalPrice} грн</div>`;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.style.position = 'relative';
        card.innerHTML = `
            <div class="product-img" onclick="goToProduct(${item.id})">
                ${badgeHTML}
                <img src="${imgSrc}" alt="${item.title}">
            </div>
            <div class="product-info" onclick="goToProduct(${item.id})">
                <div class="product-title">${item.title}</div>
                <div class="product-price-block">${priceHTML}</div>
            </div>
            <div class="product-btn">
                <button class="btn-fav" onclick="event.stopPropagation(); addToFav(${item.id})">В обране</button>
                <button class="btn-cart" onclick="event.stopPropagation(); addToCart(${item.id})">В кошик</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function goToProduct(id) {
    window.location.href = `product.html?id=${id}`;
}

// Функция отрисовки карточки для главной страницы (index.html)
function renderCard(item, container, blockType) {
    const imgSrc = (item.img && (item.img.startsWith('http') || item.img.startsWith('/')))
        ? item.img
        : `/${item.img || ''}`;

    const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)).toFixed(2) : item.price.toFixed(2);

    let badgeHTML = '';

    // Новая строгая логика для главной страницы:
    if (blockType === 'new') {
        // В новинках ВСЕГДА пишем "New"
        badgeHTML = `<div class="badge badge-new">New</div>`;
    } else if (blockType === 'sale' && item.discount > 0) {
        badgeHTML = `<div class="badge badge-sale">-${item.discount}%</div>`;
    }

    let priceHTML = item.discount > 0
        ? `<div class="product-price-old">${item.price.toFixed(2)} грн</div>
           <div class="product-price price-sale">${finalPrice} грн</div>`
        : `<div class="product-price">${finalPrice} грн</div>`;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.position = 'relative';
    card.innerHTML = `
        <div class="product-img" onclick="goToProduct(${item.id})">
            ${badgeHTML}
            <img src="${imgSrc}" alt="${item.title}">
        </div>
        <div class="product-info" onclick="goToProduct(${item.id})">
            <div class="product-title">${item.title}</div>
            <div class="product-price-block">${priceHTML}</div>
        </div>
        <div class="product-btn">
            <button class="btn-fav" onclick="event.stopPropagation(); addToFav(${item.id})">В обране</button>
            <button class="btn-cart" onclick="event.stopPropagation(); addToCart(${item.id})">В кошик</button>
        </div>
    `;
    container.appendChild(card);
}

// Поиск (Suggestions)
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('header-search-input');
    const suggestionsContainer = document.getElementById('search-suggestions');

    if (!searchInput || !suggestionsContainer) return;

    let allProducts = [];

    // Получаем список всех товаров один раз, чтобы быстро фильтровать "на лету" без спама запросами
    async function loadProductsForSearch() {
        try {
            const response = await fetch(API_URL);
            if (response.ok) {
                allProducts = await response.json();
            }
        } catch (error) {
            console.error("Ошибка предзагрузки товаров для поиска:", error);
        }
    }

    loadProductsForSearch();

    // Обработчик ввода текста
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (query.length < 1) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            return;
        }

        const matchedProducts = allProducts.filter(p =>
            (p.title && p.title.toLowerCase().includes(query)) ||
            (p.category && p.category.some(cat => cat.toLowerCase().includes(query)))
        ).slice(0, 6);

        renderSuggestions(matchedProducts);
    });

    // Отрисовка списка совпадений
    function renderSuggestions(products) {
        suggestionsContainer.innerHTML = '';

        if (products.length === 0) {
            suggestionsContainer.innerHTML = '<div class="suggestion-empty">Нічого не знайдено</div>';
            suggestionsContainer.style.display = 'block';
            return;
        }

        products.forEach(item => {
            const imgSrc = (item.img && (item.img.startsWith('http') || item.img.startsWith('/')))
                ? item.img
                : `/${item.img || ''}`;

            const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)).toFixed(2) : item.price.toFixed(2);

            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <img src="${imgSrc}" alt="${item.title}" class="suggestion-img">
                <div class="suggestion-info">
                    <span class="suggestion-title">${item.title}</span>
                    <span class="suggestion-price">${finalPrice} грн</span>
                </div>
            `;

            // При клике на подсказку сразу переходим на карточку товара
            div.addEventListener('click', () => {
                window.location.href = `product.html?id=${item.id}`;
            });

            suggestionsContainer.appendChild(div);
        });

        suggestionsContainer.style.display = 'block';
    }

    // Закрываем меню подсказок при клике в любое другое место экрана
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Возвращаем видимость подсказок, если пользователь кликнул по инпуту, в котором уже что-то введено
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            suggestionsContainer.style.display = 'block';
        }
    });
});

