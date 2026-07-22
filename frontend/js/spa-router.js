document.addEventListener('click', async (e) => {
    const link = e.target.closest('a');
    
    if (
        link && 
        link.href.startsWith(window.location.origin) && 
        !link.getAttribute('download') && 
        link.target !== '_blank' &&
        !link.getAttribute('href').startsWith('#')
    ) {
        e.preventDefault();
        await navigateTo(link.href);
    }
});

async function navigateTo(url) {
    const contentArea = document.getElementById('main-content');
    if (!contentArea) {
        window.location.href = url;
        return;
    }

    // Закрываем выпадающие меню шапки при переходе
    document.querySelectorAll('.catalog-menu, .offers-menu').forEach(m => m.classList.remove('_active'));

    const currentHeight = contentArea.offsetHeight;
    contentArea.style.minHeight = `${currentHeight}px`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Помилка завантаження сторінки');
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(htmlText, 'text/html');
        
        const newContent = newDoc.getElementById('main-content');
        if (!newContent) {
            throw new Error('На цільовій сторінці не знайдено #main-content');
        }

        // 1. Обновляем URL в браузере ДО вызова функций отрисовки
        history.pushState(null, '', url);
        document.title = newDoc.title;
        window.scrollTo(0, 0);

        // 2. Вставляем новый контент
        contentArea.innerHTML = newContent.innerHTML;

        // 3. Выполняем скрипты и переинициализацию
        reinitializePageScripts();

    } catch (error) {
        console.error("Помилка SPA:", error);
        // В случае любой ошибки делаем обычный переход
        window.location.href = url;
    } finally {
        // --- СНИМАЕМ БЛОКИРОВКУ ВЫСОТЫ ---
        // Даем браузеру 50мс полностью завершить рендер новой страницы,
        // после чего возвращаем автоматическую высоту
        setTimeout(() => {
            contentArea.style.minHeight = '';
        }, 100);
    }
}

// Делаем функцию доступной глобально
window.spaNavigate = navigateTo;

window.addEventListener('popstate', () => {
    reinitializePageScripts();
});

function reinitializePageScripts() {
    // Обновляем счетчики в шапке
    if (typeof window.updateHeaderCounters === 'function') {
        window.updateHeaderCounters();
    }

    // Каталог и Главная
    if (typeof window.initCatalogPage === 'function') {
        window.initCatalogPage();
    }
    
    // Страница одного товара (product.html)
    if (window.location.pathname.includes('product.html')) {
        if (typeof window.renderSingleProductPage === 'function') {
            window.renderSingleProductPage();
        }
    }
    
    // Корзина
    if (document.querySelector('.cart-menu') || document.getElementById('shop_cart')) {
        if (typeof window.renderCartPage === 'function') {
            window.renderCartPage();
        }
    }
    
    // Избранное
    if (document.querySelector('.fav-menu') || document.getElementById('favourite')) {
        if (typeof window.renderFavPage === 'function') {
            window.renderFavPage();
        }
    }

    // Переинициализация Аккордеона
    if (typeof window.initAccordions === 'function') {
        window.initAccordions();
    }

    // Переинициализация Слайдера
    if (typeof window.initSwiper === 'function') {
        window.initSwiper();
    }
}