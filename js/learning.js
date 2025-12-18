// Инициализация страницы Обучение
function initLearning() {
    console.log('Инициализация страницы Обучение');
    
    // Инициализация аккордеона
    const accordionHeaders = $$('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = item.querySelector('.accordion-content');
            const isOpen = content.classList.contains('open');
            
            // Закрываем все остальные
            $$('.accordion-content').forEach(c => c.classList.remove('open'));
            $$('.accordion-header').forEach(h => h.classList.remove('active'));
            
            // Открываем/закрываем текущий
            if (!isOpen) {
                content.classList.add('open');
                header.classList.add('active');
            }
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLearning);
} else {
    initLearning();
}


