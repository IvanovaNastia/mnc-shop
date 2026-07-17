// 1. Логика открытия выпадающего меню каталога
const catalogBtns = document.querySelectorAll('.header-catalog-btn, .banner-action-btn');
const catalogMenu = document.querySelector('.catalog-menu');

// 2. Логика открытия выпадающего меню предложений (Новинки, Акции...)
const offersBtn = document.querySelector('.header-offers-btn');
const offersMenu = document.querySelector('.offers-menu');

// Обработчик для КАТАЛОГА
if (catalogBtns.length > 0 && catalogMenu) {
    catalogBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
            // Переключаем каталог
            catalogMenu.classList.toggle('_active');
            
            // Если при этом открыто меню предложений — закрываем его
            if (offersMenu && offersMenu.classList.contains('_active')) {
                offersMenu.classList.remove('_active');
            }
            console.log("Каталог переключен");
        });
    });
}

// Обработчик для ПРЕДЛОЖЕНИЙ
if (offersBtn && offersMenu) {
    offersBtn.addEventListener('click', function () {
        // Переключаем меню предложений
        offersMenu.classList.toggle('_active');
        
        // Если при этом открыт каталог — закрываем его
        if (catalogMenu && catalogMenu.classList.contains('_active')) {
            catalogMenu.classList.remove('_active');
        }
        console.log("Меню предложений переключено");
    });
}