var API_URL = window.API_URL || 'https://mnc-backend.onrender.com/api/products';
var BACKEND_URL = window.BACKEND_URL || 'https://mnc-backend.onrender.com';

// ⚙️ НАСТРОЙКИ ПАГИНАЦИИ
let currentPage = 1;
const ITEMS_PER_PAGE = 20; // Сколько товаров показывать на 1 странице

function getImageUrl(path) {
    if (!path) return 'img/no-image.png';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/uploads/')) return `${BACKEND_URL}${path}`;
    if (path.startsWith('uploads/')) return `${BACKEND_URL}/${path}`;
    return path.startsWith('/') ? path : `/${path}`;
}

async function initCatalogPage() {
    console.log("🔄 initCatalogPage запущен на URL:", window.location.href);

    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const category = urlParams.get('category');
    const searchQuery = urlParams.get('search');

    const titleElement = document.getElementById('title');
    const gridElement = document.getElementById('product-grid');

    const newContainer = document.getElementById('new-products-grid');
    const popularContainer = document.getElementById('popular-products-grid');
    const saleContainer = document.getElementById('sale-products-grid');

    const isMainPage = newContainer || popularContainer || saleContainer;
    const isCatalogPage = gridElement && titleElement;

    if (!isMainPage && !isCatalogPage) {
        console.log("⚠️ На этой странице нет контейнеров для товаров.");
        return;
    }

    try {
        console.log("📡 Делаем fetch запрос к бэкенду...");
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Ошибка загрузки данных с сервера');

        const products = await response.json();
        console.log(`✅ Получено ${products.length} товаров с бэкенда`);

        // 1. Логика для страницы КАТАЛОГА (special.html)
        if (isCatalogPage) {
            console.log("📦 Отрисовка страницы КАТАЛОГА...");
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
                filteredProducts = products.filter(p => {
                    if (!p.category) return false;
                    return Array.isArray(p.category) 
                        ? p.category.includes(category) 
                        : p.category === category;
                });
            } else {
                pageTitle = "Каталог товарів";
                filteredProducts = [...products];
            }

            titleElement.textContent = pageTitle;
            
            // Сбрасываем страницу на 1-ю и рендерим с пагинацией
            currentPage = 1;
            renderPaginatedCatalog(filteredProducts, gridElement, type);
        }

        // 2. Логика для ГЛАВНОЙ СТРАНИЦЫ (index.html)
        if (isMainPage) {
            console.log("🏠 Отрисовка ГЛАВНОЙ страницы...");
            if (newContainer) {
                newContainer.innerHTML = '';
                const newProducts = products.filter(item => item.isNew).slice(0, 4);
                newProducts.forEach(item => renderCard(item, newContainer, 'new'));
            }

            if (popularContainer) {
                popularContainer.innerHTML = '';
                const popularProducts = products.filter(item => item.isPopular).slice(0, 4);
                popularProducts.forEach(item => renderCard(item, popularContainer, 'popular'));
            }

            if (saleContainer) {
                saleContainer.innerHTML = '';
                const saleProducts = products.filter(item => item.discount > 0).slice(0, 4);
                saleProducts.forEach(item => renderCard(item, saleContainer, 'sale'));
            }

            if (typeof window.initSwiper === 'function') {
                setTimeout(() => window.initSwiper(), 100);
            }
        }

    } catch (error) {
        console.error('Ошибка при загрузке каталога:', error);
        if (gridElement) {
            gridElement.innerHTML = '<div class="empty-message">Не вдалося завантажити товари. Спробуйте пізніше.</div>';
        }
    }
}

window.initCatalogPage = initCatalogPage;
document.addEventListener('DOMContentLoaded', initCatalogPage);

// 🔄 ФУНКЦИЯ ОТРЕСОВКИ С ПАГИНАЦИЕЙ
function renderPaginatedCatalog(productsList, container, currentType) {
    const totalPages = Math.ceil(productsList.length / ITEMS_PER_PAGE);

    if (currentPage < 1) currentPage = 1;
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentProducts = productsList.slice(startIndex, endIndex);

    // Отрисовываем только товары текущей страницы
    renderProductGrid(currentProducts, container, currentType);

    // Отрисовываем стрелки снизу
    renderPaginationControls(productsList, container, currentType, totalPages);
}

// ⬅️ ➡️ ФУНКЦИЯ СОЗДАНИЯ СТРЕЛОК И КНОПОК
function renderPaginationControls(productsList, container, currentType, totalPages) {
    let paginationContainer = document.getElementById('pagination-controls');

    // Если контейнера для кнопок ещё нет в HTML — создаём его под блоком товаров
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-controls';
        paginationContainer.className = 'pagination-container';
        container.parentNode.insertBefore(paginationContainer, container.nextSibling);
    }

    // Если 1 страница или нет товаров — скрываем кнопки
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    paginationContainer.innerHTML = `
        <button class="pagination-btn" id="prev-page-btn" ${currentPage === 1 ? 'disabled' : ''}>
            ← Назад
        </button>
        <span class="pagination-info">Сторінка ${currentPage} з ${totalPages}</span>
        <button class="pagination-btn" id="next-page-btn" ${currentPage === totalPages ? 'disabled' : ''}>
            Вперед →
        </button>
    `;

    // Слушатель "Назад"
    const prevBtn = document.getElementById('prev-page-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderPaginatedCatalog(productsList, container, currentType);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // Слушатель "Вперед"
    const nextBtn = document.getElementById('next-page-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderPaginatedCatalog(productsList, container, currentType);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
}

function renderProductGrid(productsList, container, currentType) {
    container.innerHTML = '';

    if (productsList.length === 0) {
        container.innerHTML = '<div class="empty-message">Наразі немає товарів у цій категорії.</div>';
        return;
    }

    productsList.forEach(item => {
        const imgSrc = getImageUrl(item.img);
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
    const url = `product.html?id=${id}`;
    if (typeof window.spaNavigate === 'function') {
        window.spaNavigate(url);
    } else {
        window.location.href = url;
    }
}

function renderCard(item, container, blockType) {
    const imgSrc = getImageUrl(item.img);
    const finalPrice = item.discount > 0 ? (item.price * (1 - item.discount / 100)).toFixed(2) : item.price.toFixed(2);

    let badgeHTML = '';
    if (blockType === 'new') {
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

// Заглушки
if (typeof window.addToCart !== 'function') {
    window.addToCart = function(id) { console.log(`Товар ${id} добавлен в корзину`); };
}
if (typeof window.addToFav !== 'function') {
    window.addToFav = function(id) { console.log(`Товар ${id} добавлен в избранное`); };
}

// Поисковые подсказки
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('header-search-input');
    const suggestionsContainer = document.getElementById('search-suggestions');

    if (!searchInput || !suggestionsContainer) return;

    let allProducts = [];

    async function loadProductsForSearch() {
        try {
            const response = await fetch(API_URL);
            if (response.ok) allProducts = await response.json();
        } catch (error) {
            console.error("Ошибка поиска:", error);
        }
    }

    loadProductsForSearch();

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (query.length < 1) {
            suggestionsContainer.innerHTML = '';
            suggestionsContainer.style.display = 'none';
            return;
        }

        const matchedProducts = allProducts.filter(p => {
            const matchesTitle = p.title && p.title.toLowerCase().includes(query);
            let matchesCategory = false;
            if (p.category) {
                if (Array.isArray(p.category)) {
                    matchesCategory = p.category.some(cat => cat.toLowerCase().includes(query));
                } else if (typeof p.category === 'string') {
                    matchesCategory = p.category.toLowerCase().includes(query);
                }
            }
            return matchesTitle || matchesCategory;
        }).slice(0, 6);

        renderSuggestions(matchedProducts);
    });

    function renderSuggestions(products) {
        suggestionsContainer.innerHTML = '';

        if (products.length === 0) {
            suggestionsContainer.innerHTML = '<div class="suggestion-empty">Нічого не знайдено</div>';
            suggestionsContainer.style.display = 'block';
            return;
        }

        products.forEach(item => {
            const imgSrc = getImageUrl(item.img);
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

            div.addEventListener('click', () => goToProduct(item.id));
            suggestionsContainer.appendChild(div);
        });

        suggestionsContainer.style.display = 'block';
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length > 0) {
            suggestionsContainer.style.display = 'block';
        }
    });
});