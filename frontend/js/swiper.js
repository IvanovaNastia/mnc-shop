function initSwiper() {
  if (!document.querySelector('.swiper')) return;

  // Если слайдер уже инициализирован, уничтожаем старый экземпляр перед новым созданием
  if (window.mySwiperInstance) {
    window.mySwiperInstance.destroy(true, true);
  }

  window.mySwiperInstance = new Swiper('.swiper', {
    direction: 'horizontal',
    loop: true,
    autoplay: { delay: 2500 },
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
}

window.initSwiper = initSwiper;
document.addEventListener('DOMContentLoaded', initSwiper);