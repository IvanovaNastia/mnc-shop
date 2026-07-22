function initAccordions() {
  const accordions = document.querySelectorAll('.accordion-item');

  accordions.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');
    
    if (!trigger || !content) return;

    // Предотвращаем дублирование обработчиков
    if (trigger.dataset.accordionInited) return;
    trigger.dataset.accordionInited = "true";

    trigger.addEventListener('click', () => {
      const isActive = item.classList.toggle('active');
      
      if (isActive) {
        content.style.maxHeight = content.scrollHeight + 'px';
        setTimeout(() => {
          if (item.classList.contains('active')) {
            content.style.maxHeight = 'none';
          }
        }, 300);
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        requestAnimationFrame(() => {
          content.style.maxHeight = '0px';
        });
      }
    });
  });
}

// Привязываем к window для SPA и запускаем при первой загрузке
window.initAccordions = initAccordions;
document.addEventListener('DOMContentLoaded', initAccordions);