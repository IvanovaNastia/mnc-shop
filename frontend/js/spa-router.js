// 1. Проверяем, реагирует ли роутер ХОТЯ БЫ НА ЧТО-ТО при клике
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
        console.log("🔥 КЛИК ПО ССЫЛКЕ:", link.getAttribute('href'), "Полный URL:", link.href);
    }
}, true); // UseCapture: перехватываем клик ДО того, как его кто-то заблокирует

document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    
    if (
        link && 
        link.href &&
        link.href.startsWith(window.location.origin) && 
        !link.getAttribute('download') && 
        link.target !== '_blank' &&
        !link.getAttribute('href').startsWith('#')
    ) {
        e.preventDefault();
        console.log("🔗 SPA Переход по ссылке:", link.href);
        await navigateTo(link.href);
    }
});

async function navigateTo(url) {
    const contentArea = document.getElementById('main-content');
    if (!contentArea) {
        window.location.href = url;
        return;
    }

    // Закрываем выпадающие меню
    document.querySelectorAll('.catalog-menu, .offers-menu').forEach(m => m.classList.remove('_active'));

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Помилка завантаження сторінки');
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(htmlText, 'text/html');
        
        const newContent = newDoc.getElementById('main-content');
        if (!newContent) {
            console.warn('В новом документе не найден #main-content, переходим обычно');
            window.location.href = url;
            return;
        }

        // 1. Меняем URL в строке браузера
        history.pushState(null, '', url);
        document.title = newDoc.title;
        window.scrollTo(0, 0);

        // 2. Вставляем новый HTML
        contentArea.innerHTML = newContent.innerHTML;

        // 3. Вызываем переинициализацию скриптов
        reinitializePageScripts();

    } catch (error) {
        console.error("Помилка SPA:", error);
        window.location.href = url;
    }
}

// Глобальная функция для вызова из других JS
window.spaNavigate = navigateTo;

// Обработка кнопок «Назад / Вперед» в браузере
window.addEventListener('popstate', () => {
    reinitializePageScripts();
});

function reinitializePageScripts() {
    console.log("👉 Запуск reinitializePageScripts");

    // 1. Счетчики хедера
    try {
        if (typeof window.updateHeaderCounters === 'function') window.updateHeaderCounters();
    } catch (e) { console.error("Ошибка в updateHeaderCounters:", e); }

    // 2. Каталог и Главная (он сам внутри вызовет Swiper после рендера)
    try {
        if (typeof window.initCatalogPage === 'function') window.initCatalogPage();
    } catch (e) { console.error("Ошибка в initCatalogPage:", e); }

    // 3. Отдельная страница товара
    try {
        if (window.location.pathname.includes('product.html') && typeof window.renderSingleProductPage === 'function') {
            window.renderSingleProductPage();
        }
    } catch (e) { console.error("Ошибка в renderSingleProductPage:", e); }

    // 4. Корзина и Избранное
    try {
        if (typeof window.renderCartPage === 'function') window.renderCartPage();
        if (typeof window.renderFavPage === 'function') window.renderFavPage();
    } catch (e) { console.error("Ошибка в renderCartPage/FavPage:", e); }

    // 5. Аккордеон
    try {
        if (typeof window.initAccordions === 'function') window.initAccordions();
    } catch (e) { console.error("Ошибка в initAccordions:", e); }

    // 6. Выпадающее меню хедера
    try {
        if (typeof window.initHeaderMenus === 'function') window.initHeaderMenus();
    } catch (e) { console.error("Ошибка в initHeaderMenus:", e); }
}