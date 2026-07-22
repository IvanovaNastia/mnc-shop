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
    console.log("👉 1. Запуск reinitializePageScripts");

    // 1. Счетчики
    try {
        if (typeof window.updateHeaderCounters === 'function') window.updateHeaderCounters();
    } catch (e) { console.error("Ошибка в updateHeaderCounters:", e); }

    // 2. КАТАЛОГ И ГЛАВНАЯ
    try {
        console.log("👉 2. Пробуем вызвать initCatalogPage...");
        if (typeof window.initCatalogPage === 'function') {
            window.initCatalogPage();
        } else {
            console.error("❌ window.initCatalogPage НЕ НАЙДЕН в window!");
        }
    } catch (e) { console.error("Ошибка в initCatalogPage:", e); }

    // 3. Слайдер
    try {
        if (typeof window.initSwiper === 'function') window.initSwiper();
    } catch (e) { console.error("Ошибка в initSwiper:", e); }

    // 4. Аккордеон
    try {
        if (typeof window.initAccordions === 'function') window.initAccordions();
    } catch (e) { console.error("Ошибка в initAccordions:", e); }
}