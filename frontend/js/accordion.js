function initAccordions() {
  const accordions = document.querySelectorAll('.accordion-item');
  if (!accordions.length) return;

  accordions.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');

    if (!trigger || !content) return;

    // Сбрасываем старый слушатель через замену (чистый подход)
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    newTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = item.classList.toggle('active');

      if (isActive) {
        content.style.maxHeight = content.scrollHeight + 'px';
        setTimeout(() => {
          if (item.classList.contains('active')) {
            content.style.maxHeight = 'none';
          }
        }, 300);
      } else {
        // Задаем текущую высоту, чтобы анимация свернулась плавно
        content.style.maxHeight = content.scrollHeight + 'px';
        requestAnimationFrame(() => {
          content.style.maxHeight = '0px';
        });
      }
    });
  });
}

window.initAccordions = initAccordions;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAccordions);
} else {
  initAccordions();
}