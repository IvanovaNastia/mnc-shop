// 1. Отслеживание кликов по ссылкам
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

    // Закрываем выпадающие меню хедера
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

        // 1. Обновляем URL и заголовок
        history.pushState(null, '', url);
        document.title = newDoc.title;

        // 2. Вставляем только контент <main>
        contentArea.innerHTML = newContent.innerHTML;

        // 3. Переинициализируем скрипты страницы
        reinitializePageScripts();

        // 4. Логика скролла: к якорю (#pay, #return и т.д.) или наверх
        const hash = window.location.hash;
        if (hash) {
            setTimeout(() => {
                const targetElem = document.querySelector(hash);
                if (targetElem) {
                    targetElem.scrollIntoView({ behavior: 'smooth' });
                } else {
                    window.scrollTo(0, 0);
                }
            }, 150);
        } else {
            window.scrollTo(0, 0);
        }

    } catch (error) {
        console.error("Помилка SPA:", error);
        window.location.href = url;
    }
}

// Глобальная функция для вызова из других JS
window.spaNavigate = navigateTo;

// Обработка кнопок «Назад / Вперед» в браузере
window.addEventListener('popstate', () => {
    const contentArea = document.getElementById('main-content');
    if (contentArea) {
        fetch(window.location.href)
            .then(res => res.text())
            .then(html => {
                const parser = new DOMParser();
                const newDoc = parser.parseFromString(html, 'text/html');
                const newContent = newDoc.getElementById('main-content');
                if (newContent) contentArea.innerHTML = newContent.innerHTML;
                reinitializePageScripts();
            });
    } else {
        reinitializePageScripts();
    }
});

function reinitializePageScripts() {
    console.log("👉 Запуск reinitializePageScripts");

    // 1. Счетчики хедера
    try {
        if (typeof window.updateHeaderCounters === 'function') window.updateHeaderCounters();
    } catch (e) { console.error("Ошибка в updateHeaderCounters:", e); }

    // 2. Аккордеон (запускается первым для гарантированной работы на странице info.html)
    try {
        if (typeof window.initAccordions === 'function') window.initAccordions();
    } catch (e) { console.error("Ошибка в initAccordions:", e); }

    // 3. Каталог и Главная
    try {
        if (typeof window.initCatalogPage === 'function') window.initCatalogPage();
    } catch (e) { console.error("Ошибка в initCatalogPage:", e); }

    // 4. Страница товара
    try {
        if (window.location.pathname.includes('product.html') && typeof window.renderSingleProductPage === 'function') {
            window.renderSingleProductPage();
        }
    } catch (e) { console.error("Ошибка в renderSingleProductPage:", e); }

    // 5. Корзина и Избранное
    try {
        if (typeof window.renderCartPage === 'function') window.renderCartPage();
        if (typeof window.renderFavPage === 'function') window.renderFavPage();
    } catch (e) { console.error("Ошибка в renderCartPage/FavPage:", e); }

    // 6. Слайдер Swiper — переносим вызов с небольшой задержкой на случай, если карточки уже были в DOM
    try {
        if (document.querySelector('.swiper') && typeof window.initSwiper === 'function') {
            setTimeout(() => {
                window.initSwiper();
            }, 150);
        }
    } catch (e) { console.error("Ошибка в initSwiper:", e); }

    // 7. Выпадающее меню хедера
    try {
        if (typeof window.initHeaderMenus === 'function') window.initHeaderMenus();
    } catch (e) { console.error("Ошибка в initHeaderMenus:", e); }
}