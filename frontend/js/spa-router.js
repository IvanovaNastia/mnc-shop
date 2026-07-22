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

    // Фиксируем высоту для защиты от скачков
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

        // 1. Сначала обновляем URL в браузере, чтобы window.location.search соответствовал новому URL!
        history.pushState(null, '', url);
        document.title = newDoc.title;
        window.scrollTo(0, 0);

        // 2. Вставляем новый контент
        contentArea.innerHTML = newContent.innerHTML;

        // 3. Выполняем скрипты с новой страницы (если они там есть)
        executeScriptsFromNewPage(newDoc);

        // 4. Переинициализируем все JS-модули
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

window.addEventListener('popstate', async () => {
    // При навигации назад/вперед вручную вызываем инициализацию
    reinitializePageScripts();
});

// Функция для выполнения скриптов, которые были на подгруженной странице
function executeScriptsFromNewPage(newDoc) {
    const scripts = newDoc.querySelectorAll('script');
    scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        document.body.appendChild(newScript);
        newScript.remove();
    });
}

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
}