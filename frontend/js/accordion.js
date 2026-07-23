function initAccordions() {
  const accordions = document.querySelectorAll('.accordion-item');

  accordions.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');
    
    if (!trigger || !content) return;

    // Клонируем элемент trigger, чтобы на 100% очистить любые старые addEventListener
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    newTrigger.addEventListener('click', () => {
      const isActive = item.classList.toggle('active');
      
      if (isActive) {
        content.style.maxHeight = content.scrollHeight + 'px';
        setTimeout(() => {
          if (item.classList.contains('active')) {
            content.style.maxHeight = 'none';
          }
        }, 300);
      } else {
        // Задаем явную высоту перед сбросом в 0, чтобы сработала CSS-анимация
        content.style.maxHeight = content.scrollHeight + 'px';
        requestAnimationFrame(() => {
          content.style.maxHeight = '0px';
        });
      }
    });
  });
}

window.initAccordions = initAccordions;

// Запуск при обычной первой загрузке
document.addEventListener('DOMContentLoaded', initAccordions);