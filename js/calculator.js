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
    // Цены продуктов (можно расширить)
    if (!window.productPrices) {
        window.productPrices = {
            twix: 150,
            jager: 300,
            gin: 250,
            rum: 280,
            cognac: 350,
            whiskey: 320,
            vodka: 200,
            pepper: 50,
            redbull: 120,
            cola: 100,
            baikal: 90,
            borjomi: 110,
            white_wine: 180,
            red_wine: 200,
            apple: 80,
            tomato: 60,
            corona: 160,
            stella: 160,
            gancha: 220,
            martini: 240,
            orange: 70,
            cherry: 75,
            loriot: 300,
            whiskey02: 160
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

    const products = Object.entries(appData.products).map(([key, name]) => ({
        key,
        name,
        emoji: PRODUCT_EMOJIS[key] || '📦',
        price: window.productPrices[key] || 0
    }));

    let html = '';

    products.forEach(product => {
        const count = window.selectedProducts[product.key] || 0;
        const isSelected = count > 0;

        html += `
            <div class="calc-chip${isSelected ? ' selected' : ''}" data-product="${product.key}">
                <div class="calc-label">
                    <span style="font-size: 18px;">${product.emoji}</span>
                    <span>${product.name}</span>
                    <span class="calc-price">${product.price} ₽</span>
                </div>
                <div class="calc-count">${count || ''}</div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Добавление обработчиков кликов
    $$('.calc-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const productKey = chip.getAttribute('data-product');
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
            return `${name}: ${count} × ${price} ₽ = ${totalPrice} ₽`;
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


