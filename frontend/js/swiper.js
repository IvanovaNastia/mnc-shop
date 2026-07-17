const swiper = new Swiper('.swiper', {
  // Optional parameters
  direction: 'horizontal',
  loop: true,

  autoplay: {
   delay: 2500,
  },

  speed: 1000,

  breakpoints: {
    500: {
      slidesPerView: 1,
      // spaceBetween: 20,
      slidesPerGroup: 1
    },
    700: {
      slidesPerView: 2,
      // spaceBetween: 30,
      slidesPerGroup: 1
    },
  },

  // slidesPerView: 2,
  spaceBetween: 10,

  // If we need pagination
  pagination: {
    el: '.swiper-pagination',
    type: 'bullets', // Этот параметр меняет полоску на точки
    clickable: true, // Позволяет кликать по точкам для смены слайдов
  },

  // Navigation arrows
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
});