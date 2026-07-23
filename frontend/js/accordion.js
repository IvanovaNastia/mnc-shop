function initAccordions() {
  const accordions = document.querySelectorAll('.accordion-item');

  accordions.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');
    
    if (!trigger || !content) return;

    // Снимаем старый флаг, если элемент был перезагружен через SPA
    if (!document.body.contains(trigger)) return;

    // Удаляем прошлый обработчик, чтобы не плодить дубли
    if (trigger._accordionHandler) {
      trigger.removeEventListener('click', trigger._accordionHandler);
    }

    const clickHandler = () => {
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
    };

    trigger._accordionHandler = clickHandler;
    trigger.addEventListener('click', clickHandler);
  });
}

window.initAccordions = initAccordions;
document.addEventListener('DOMContentLoaded', initAccordions);