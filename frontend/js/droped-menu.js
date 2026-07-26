function initHeaderMenus() {
    const catalogBtns = document.querySelectorAll('.header-catalog-btn');
    const catalogMenu = document.querySelector('.catalog-menu');
    const offersBtn = document.querySelector('.header-offers-btn');
    const offersMenu = document.querySelector('.offers-menu');

    // Функция для полного сброса состояния (закрываем меню и все подменю)
    function resetAllMenus() {
        if (catalogMenu) catalogMenu.classList.remove('_active');
        if (offersMenu) offersMenu.classList.remove('_active');

        document.querySelectorAll('.has-submenu._open').forEach(function (item) {
            item.classList.remove('_open');
        });
    }

    // 1. Выпадающее меню КАТАЛОГА
    if (catalogBtns.length > 0 && catalogMenu) {
        catalogBtns.forEach(function (btn) {
            btn.onclick = function (e) {
                e.stopPropagation();

                const isActive = catalogMenu.classList.contains('_active');

                if (isActive) {
                    resetAllMenus();
                } else {
                    if (offersMenu) offersMenu.classList.remove('_active');
                    catalogMenu.classList.add('_active');
                }
            };
        });
    }

    // 2. Выпадающее меню ПРЕДЛОЖЕНИЙ
    if (offersBtn && offersMenu) {
        offersBtn.onclick = function (e) {
            e.stopPropagation();

            const isActive = offersMenu.classList.contains('_active');

            if (isActive) {
                resetAllMenus();
            } else {
                if (catalogMenu) catalogMenu.classList.remove('_active');
                offersMenu.classList.add('_active');
            }
        };
    }

    // 3. Переключение (открытие/закрытие) подменю
    const submenuToggles = document.querySelectorAll('.submenu-toggle');
    submenuToggles.forEach(function (toggle) {
        toggle.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation(); // Не даем событию всплыть к клику по странице

            const parentLi = this.closest('.has-submenu');

            if (parentLi) {
                const isOpen = parentLi.classList.contains('_open');

                // Закрываем другие открытые подменю
                document.querySelectorAll('.has-submenu._open').forEach(function (openItem) {
                    if (openItem !== parentLi) {
                        openItem.classList.remove('_open');
                    }
                });

                if (isOpen) {
                    parentLi.classList.remove('_open');
                } else {
                    parentLi.classList.add('_open');
                }
            }
        });
    });

    // 4. Закрытие меню ТОЛЬКО при реальном переходе по ссылке
    // Выбираем только ссылки внутри подменю (.submenu a) и обычные ссылки каталога без подменю (.catalog-list > li > a)
    const transitionLinks = document.querySelectorAll('.submenu a, .catalog-list > li > a, .offers-menu a');
    transitionLinks.forEach(function (link) {
        link.addEventListener('click', function () {
            resetAllMenus();
        });
    });

    // 5. Закрытие меню при клике вне его области
    document.addEventListener('click', function (e) {
        const isClickInsideCatalog = catalogMenu && catalogMenu.contains(e.target);
        const isClickOnCatalogBtn = e.target.closest('.header-catalog-btn');
        
        const isClickInsideOffers = offersMenu && offersMenu.contains(e.target);
        const isClickOnOffersBtn = e.target.closest('.header-offers-btn');

        if (!isClickInsideCatalog && !isClickOnCatalogBtn && catalogMenu && catalogMenu.classList.contains('_active')) {
            resetAllMenus();
        }

        if (!isClickInsideOffers && !isClickOnOffersBtn && offersMenu && offersMenu.classList.contains('_active')) {
            offersMenu.classList.remove('_active');
        }
    });
}

// Сброс состояния при выгрузке/переходе
window.addEventListener('pagehide', function () {
    document.querySelectorAll('.has-submenu._open').forEach(function (item) {
        item.classList.remove('_open');
    });
    const catalogMenu = document.querySelector('.catalog-menu');
    if (catalogMenu) catalogMenu.classList.remove('_active');
});

window.initHeaderMenus = initHeaderMenus;
document.addEventListener('DOMContentLoaded', initHeaderMenus);