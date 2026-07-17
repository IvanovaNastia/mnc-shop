const accordions = document.querySelectorAll('.accordion-item');

accordions.forEach(item => {
  const trigger = item.querySelector('.accordion-trigger');
  const content = item.querySelector('.accordion-content');
  
  trigger.addEventListener('click', () => {
    const isActive = item.classList.toggle('active');
    
    if (isActive) {
      // 1. Сначала ставим точную высоту для запуска плавной анимации
      content.style.maxHeight = content.scrollHeight + 'px';
      
      // 2. Ждем, пока анимация (300ms) закончится, и убираем лимит
      setTimeout(() => {
        if (item.classList.contains('active')) {
          content.style.maxHeight = 'none';
        }
      }, 300); // Время должно совпадать с transition в CSS (0.3s = 300ms)
      
    } else {
      // 3. При закрытии сначала возвращаем текущую высоту в пикселях...
      content.style.maxHeight = content.scrollHeight + 'px';
      
      // ...и тут же (в следующем кадре) сбрасываем в 0, чтобы сработало закрытие
      requestAnimationFrame(() => {
        content.style.maxHeight = '0px';
      });
    }
  });
});