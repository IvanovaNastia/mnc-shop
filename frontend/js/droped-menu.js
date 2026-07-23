function initHeaderMenus() {
    const catalogBtns = document.querySelectorAll('.header-catalog-btn, .banner-action-btn');
    const catalogMenu = document.querySelector('.catalog-menu');
    const offersBtn = document.querySelector('.header-offers-btn');
    const offersMenu = document.querySelector('.offers-menu');

    // 1. Выпадающее меню КАТАЛОГА
    if (catalogBtns.length > 0 && catalogMenu) {
        catalogBtns.forEach(function (btn) {
            btn.onclick = function (e) {
                e.stopPropagation();
                catalogMenu.classList.toggle('_active');
                if (offersMenu) offersMenu.classList.remove('_active');
            };
        });
    }

    // 2. Выпадающее меню ПРЕДЛОЖЕНИЙ (Акционные товары / Новинки)
    if (offersBtn && offersMenu) {
        offersBtn.onclick = function (e) {
            e.stopPropagation();
            offersMenu.classList.toggle('_active');
            if (catalogMenu) catalogMenu.classList.remove('_active');
        };
    }
}

// Привязываем к window для доступа из SPA-роутера и запускаем при первой загрузке страницы
window.initHeaderMenus = initHeaderMenus;
document.addEventListener('DOMContentLoaded', initHeaderMenus);