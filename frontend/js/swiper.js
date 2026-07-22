function initSwiper() {
  const swiperElem = document.querySelector('.swiper');
  if (!swiperElem) return;

  // Если прошлый экземпляр Swiper существовал, уничтожаем его перед повторной инициализацией
  if (window.mySwiperInstance) {
    window.mySwiperInstance.destroy(true, true);
  }

  window.mySwiperInstance = new Swiper('.swiper', {
    direction: 'horizontal',
    loop: true,
    autoplay: {
      delay: 2500,
    },
    speed: 1000,
    breakpoints: {
      500: {
        slidesPerView: 1,
        slidesPerGroup: 1
      },
      700: {
        slidesPerView: 2,
        slidesPerGroup: 1
      },
    },
    spaceBetween: 10,
    pagination: {
      el: '.swiper-pagination',
      type: 'bullets',
      clickable: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  });
}

// Привязываем к window для SPA и запускаем при первой загрузке
window.initSwiper = initSwiper;
document.addEventListener('DOMContentLoaded', initSwiper);