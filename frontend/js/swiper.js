function initSwiper() {
  const swiperElem = document.querySelector('.swiper');
  if (!swiperElem) return;

  if (typeof Swiper === 'undefined') {
    console.warn("Библиотека Swiper не загружена на странице");
    return;
  }

  // Уничтожаем старый экземпляр
  if (window.mySwiperInstance) {
    try {
      window.mySwiperInstance.destroy(true, true);
      window.mySwiperInstance = null;
    } catch (e) {
      console.error("Ошибка при уничтожении предыдущего Swiper:", e);
    }
  }

  // Даем браузеру отрисовать DOM перед инициализацией
  requestAnimationFrame(() => {
    window.mySwiperInstance = new Swiper('.swiper', {
      direction: 'horizontal',
      loop: true,
      observer: true,              // Отслеживает изменения DOM
      observeParents: true,        // Отслеживает изменение родительских контейнеров
      resizeObserver: true,
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

    // Принудительный перерасчет размеров
    setTimeout(() => {
      if (window.mySwiperInstance) {
        window.mySwiperInstance.update();
      }
    }, 100);
  });
}

window.initSwiper = initSwiper;
document.addEventListener('DOMContentLoaded', initSwiper);