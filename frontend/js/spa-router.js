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
        const url = link.href;
        await navigateTo(url);
    }
});

async function navigateTo(url) {
    const contentArea = document.getElementById('main-content');
    if (!contentArea) {
        window.location.href = url;
        return;
    }

    // --- БЛОКИРОВКА ДЁРГАНИЯ (Фиксируем текущую высоту) ---
    // Узнаем текущую высоту контейнера в пикселях перед заменой
    const currentHeight = contentArea.offsetHeight;
    // Временно жестко задаем эту высоту, чтобы страница не сжималась
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

        // Мгновенно заменяем контент
        contentArea.innerHTML = newContent.innerHTML;
        
        history.pushState(null, '', url);
        document.title = newDoc.title;
        window.scrollTo(0, 0);

        reinitializePageScripts();

    } catch (error) {
        console.error("Помилка SPA:", error);
        window.location.href = url;
    } finally {
        // --- СНИМАЕМ БЛОКИРОВКУ ВЫСОТЫ ---
        // Даем браузеру 50мс полностью завершить рендер новой страницы,
        // после чего возвращаем автоматическую высоту
        setTimeout(() => {
            contentArea.style.minHeight = '';
        }, 50);
    }
}

window.addEventListener('popstate', async () => {
    await navigateTo(window.location.href);
});

function reinitializePageScripts() {
    // Инициализация каталога и главной страницы
    if (typeof window.initCatalogPage === 'function') {
        window.initCatalogPage();
    }
    
    // Инициализация корзины, избранного и отдельного товара (из cart.js)
    if (typeof updateHeaderCounters === 'function') {
        updateHeaderCounters();
    }
    if (window.location.pathname.includes('product.html') && typeof renderSingleProductPage === 'function') {
        renderSingleProductPage();
    }
    if ((document.querySelector('.cart-menu') || document.getElementById('shop_cart')) && typeof renderCartPage === 'function') {
        renderCartPage();
    }
    if ((document.querySelector('.fav-menu') || document.getElementById('favourite')) && typeof renderFavPage === 'function') {
        renderFavPage();
    }
}