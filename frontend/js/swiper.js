function initSwiper() {
  const swiperElem = document.querySelector('.swiper');
  
  if (!swiperElem) {
    if (window.mySwiperInstance) {
      try {
        window.mySwiperInstance.destroy(true, true);
        window.mySwiperInstance = null;
      } catch (e) {}
    }
    return;
  }

  if (typeof Swiper === 'undefined') {
    console.warn("Библиотека Swiper не загружена");
    return;
  }

  // Всегда уничтожаем старый экземпляр при переходе, чтобы не было конфликтов высоты/ширины
  if (window.mySwiperInstance) {
    try {
      window.mySwiperInstance.destroy(true, true);
      window.mySwiperInstance = null;
    } catch (e) {}
  }

  // Запускаем новый Swiper
  window.mySwiperInstance = new Swiper('.swiper', {
    direction: 'horizontal',
    loop: true,
    observer: true,
    observeParents: true,
    resizeObserver: true,
    touchStartPreventDefault: false,
    autoplay: {
      delay: 2500,
      disableOnInteraction: false,
    },
    speed: 1000,
    breakpoints: {
      500: { slidesPerView: 1, slidesPerGroup: 1 },
      700: { slidesPerView: 2, slidesPerGroup: 1 },
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

  // Принудительный перерасчет через кадр анимации
  requestAnimationFrame(() => {
    if (window.mySwiperInstance && typeof window.mySwiperInstance.update === 'function') {
      window.mySwiperInstance.update();
    }
  });
}

window.initSwiper = initSwiper;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSwiper);
} else {
  initSwiper();
}