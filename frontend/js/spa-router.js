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

    // Закрываем меню
    document.querySelectorAll('.catalog-menu, .offers-menu').forEach(m => m.classList.remove('_active'));

    const currentHeight = contentArea.offsetHeight;
    contentArea.style.minHeight = `${currentHeight}px`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Помилка завантаження');
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const newDoc = parser.parseFromString(htmlText, 'text/html');
        
        const newContent = newDoc.getElementById('main-content');
        if (!newContent) {
            throw new Error('Не знайдено #main-content');
        }

        // 1. Обновляем URL
        history.pushState(null, '', url);
        document.title = newDoc.title;
        window.scrollTo(0, 0);

        // 2. Вставляем новый HTML
        contentArea.innerHTML = newContent.innerHTML;

        // 3. Ждем 1 кадр рендера браузера, И ТОЛЬКО ПОТОМ запускаем скрипты!
        requestAnimationFrame(() => {
            reinitializePageScripts();
        });

    } catch (error) {
        console.error("Помилка SPA:", error);
        window.location.href = url;
    } finally {
        setTimeout(() => {
            contentArea.style.minHeight = '';
        }, 150);
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