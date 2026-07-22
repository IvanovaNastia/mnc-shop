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
    console.log("⚙️ Выполняется reinitializePageScripts()");

    // 1. Счетчик шапки
    if (typeof window.updateHeaderCounters === 'function') {
        window.updateHeaderCounters();
    }

    // 2. Каталог и Главная (ПРИНУДИТЕЛЬНЫЙ ВЫЗОВ)
    if (typeof window.initCatalogPage === 'function') {
        window.initCatalogPage();
    } else {
        console.error("❌ window.initCatalogPage не найден!");
    }
    
    // 3. Страница одного товара
    if (window.location.pathname.includes('product.html')) {
        if (typeof window.renderSingleProductPage === 'function') {
            window.renderSingleProductPage();
        }
    }
    
    // 4. Корзина
    if (document.querySelector('.cart-menu') || document.getElementById('shop_cart')) {
        if (typeof window.renderCartPage === 'function') {
            window.renderCartPage();
        }
    }
    
    // 5. Избранное
    if (document.querySelector('.fav-menu') || document.getElementById('favourite')) {
        if (typeof window.renderFavPage === 'function') {
            window.renderFavPage();
        }
    }

    // 6. Аккордеон
    if (typeof window.initAccordions === 'function') {
        window.initAccordions();
    }

    // 7. Слайдер Баннера
    if (typeof window.initSwiper === 'function') {
        window.initSwiper();
    }
}