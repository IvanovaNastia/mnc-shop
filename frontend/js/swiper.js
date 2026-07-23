function initSwiper() {
  const swiperElem = document.querySelector('.swiper');

  // Если элемента .swiper НЕТ на странице — сразу чистим старый экземпляр и выходим
  if (!swiperElem) {
    if (window.mySwiperInstance) {
      try {
        window.mySwiperInstance.destroy(true, true);
        window.mySwiperInstance = null;
      } catch (e) { }
    }
    return;
  }

  if (typeof Swiper === 'undefined') {
    console.warn("Библиотека Swiper не загружена на странице");
    return;
  }

  // Если Swiper УЖЕ инициализирован и работает на этом элементе — просто обновляем его, а не пересоздаем!
  if (window.mySwiperInstance && !window.mySwiperInstance.destroyed) {
    window.mySwiperInstance.update();
    return;
  }

  // Уничтожаем старый инстанс, если он был сломан
  if (window.mySwiperInstance) {
    try {
      window.mySwiperInstance.destroy(true, true);
      window.mySwiperInstance = null;
    } catch (e) { }
  }

  // Создаем Swiper
  window.mySwiperInstance = new Swiper('.swiper', {
    direction: 'horizontal',
    loop: true,
    observer: true,
    observeParents: true,
    resizeObserver: true,
    touchStartPreventDefault: false, // ВАЖНО: не блокирует клики/тачи по остальным элементам!
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
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

window.initSwiper = initSwiper;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwiper);
} else {
  initSwiper();
}