// Инициализация страницы Калькулятор
function initCalculator() {
    console.log('Инициализация страницы Калькулятор');

    // Инициализация данных продуктов
    initCalculatorData();

    // Инициализация обработчиков
    initCalculatorListeners();

    // Рендеринг продуктов
    renderCalculatorProducts();

    // Обновление итоговой суммы
    updateCalculatorTotal();
}

function initCalculatorData() {
    // Цены продуктов (расширенные цены)
    if (!window.productPrices) {
        window.productPrices = {
            twix: 150, jager: 300, gin: 250, rum: 280, cognac: 350,
            whiskey: 320, vodka: 200, pepper: 50, redbull: 120,
            cola: 100, baikal: 90, borjomi: 110, white_wine: 180,
            red_wine: 200, apple: 80, tomato: 60, corona: 160,
            stella: 160, gancha: 220, martini: 240, orange: 70,
            cherry: 75, loriot: 300, whiskey02: 160
        };
    }

    // Состояние выбранных продуктов
    if (!window.selectedProducts) {
        window.selectedProducts = {};
    }
}

function initCalculatorListeners() {
    // Кнопка сброса
    const resetBtn = $('#calc-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetCalculator);
    }
}

function renderCalculatorProducts() {
    const container = $('#calc-chips');
    if (!container) return;

    const products = getStandardProducts();

    let html = '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';

    products.forEach(product => {
        const count = window.selectedProducts[product.key] || 0;
        const price = window.productPrices[product.key] || 0;
        const totalPrice = price * count;

        html += `
            <div class="product-btn${count > 0 ? ' active' : ''}" data-product="${product.key}">
                <div class="btn-text">
                    <div style="font-size: 16px;">${product.emoji}</div>
                    <div style="font-size: 12px; margin-top: 2px;">${product.name}</div>
                    ${price > 0 ? `<div style="font-size: 10px; color: var(--muted);">${price}₽</div>` : ''}
                </div>
                ${count > 0 ? `<div class="product-count">${count}</div>` : '<div class="product-count"></div>'}
                ${count > 1 ? `<div style="position: absolute; bottom: 2px; right: 2px; font-size: 9px; color: var(--accent); font-weight: bold;">${totalPrice}₽</div>` : ''}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Добавление обработчиков кликов
    $$('.product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productKey = btn.getAttribute('data-product');
            toggleCalculatorProduct(productKey);
        });
    });
}

function toggleCalculatorProduct(productKey) {
    const count = window.selectedProducts[productKey] || 0;
    const maxLimit = MULTI_LIMITS[productKey] || 10; // Ограничение для калькулятора

    if (count >= maxLimit) {
        // Сброс при достижении максимума
        window.selectedProducts[productKey] = 0;
    } else {
        window.selectedProducts[productKey] = count + 1;
    }

    renderCalculatorProducts();
    updateCalculatorTotal();
    updateCalculatorSelected();
}

function updateCalculatorTotal() {
    const totalEl = $('#calc-total');
    if (!totalEl) return;

    let total = 0;
    Object.entries(window.selectedProducts).forEach(([key, count]) => {
        const price = window.productPrices[key] || 0;
        total += price * count;
    });

    totalEl.textContent = `${total} ₽`;
}

function updateCalculatorSelected() {
    const selectedEl = $('#calc-selected');
    if (!selectedEl) return;

    const selectedItems = Object.entries(window.selectedProducts)
        .filter(([key, count]) => count > 0)
        .map(([key, count]) => {
            const name = appData.products[key] || key;
            const price = window.productPrices[key] || 0;
            const totalPrice = price * count;
            return `${name} × ${count} = ${totalPrice} ₽`;
        });

    if (selectedItems.length === 0) {
        selectedEl.innerHTML = '<div style="color: #666; font-style: italic;">Ничего не выбрано</div>';
    } else {
        selectedEl.innerHTML = selectedItems.map(item =>
            `<div>${item}</div>`
        ).join('');
    }
}

function resetCalculator() {
    window.selectedProducts = {};
    renderCalculatorProducts();
    updateCalculatorTotal();
    updateCalculatorSelected();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalculator);
} else {
    initCalculator();
}


