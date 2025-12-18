// Инициализация страницы Сроки
function initSroki() {
    console.log('Инициализация страницы Сроки');

    // Инициализация данных комнат
    initRoomsData();

    // Инициализация обработчиков
    initSrokiListeners();

    // Рендеринг сетки комнат
    renderRooms();
}

function initRoomsData() {
    if (!appData.rooms) {
        appData.rooms = [];
    }

    // Инициализация данных для всех номеров если не существует
    appData.roomsList.forEach(roomNumber => {
        if (!appData.rooms.find(r => r.number === roomNumber)) {
            appData.rooms.push({
                number: roomNumber,
                products: [],
                deadlineStatus: 'ok', // 'ok', 'alert', 'empty'
                lastChecked: null
            });
        }
    });
}

function initSrokiListeners() {
    // Кнопка статистики
    const statsBtn = $('#deadlines-stats-btn');
    const statsBtnMobile = $('#deadlines-stats-btn-mobile');

    if (statsBtn) {
        statsBtn.addEventListener('click', showDeadlinesStats);
    }
    if (statsBtnMobile) {
        statsBtnMobile.addEventListener('click', showDeadlinesStats);
    }

    // Кнопка сброса
    const resetBtn = $('#deadlines-reset-btn');
    const resetBtnMobile = $('#deadlines-reset-btn-mobile');

    if (resetBtn) {
        resetBtn.addEventListener('click', resetAllDeadlines);
    }
    if (resetBtnMobile) {
        resetBtnMobile.addEventListener('click', resetAllDeadlines);
    }

    // Режим выбора номеров
    const selectModeBtn = $('#deadlines-select-mode-btn');
    if (selectModeBtn) {
        selectModeBtn.addEventListener('click', toggleSelectMode);
    }

    // Кнопка печати
    const printBtn = $('#deadlines-print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printSelectedRooms);
    }
}

function renderRooms() {
    const gridEl = $('#rooms-grid');
    if (!gridEl) return;

    // Группировка по этажам
    const floors = {};
    appData.roomsList.forEach(room => {
        const floor = Math.floor(room / 100);
        if (!floors[floor]) floors[floor] = [];
        floors[floor].push(room);
    });

    let html = '';
    Object.keys(floors).sort((a, b) => a - b).forEach(floor => {
        const rooms = floors[floor];
        const floorTitle = getFloorTitle(floor);

        html += `<div class="deadlines-floor-section">`;
        html += `<div class="deadlines-floor-title">${floorTitle}</div>`;
        html += `<div class="deadlines-room-list">`;

        rooms.forEach(room => {
            const roomData = appData.rooms.find(r => r.number === room) || { deadlineStatus: 'empty' };
            const className = `deadlines-room-item status-${roomData.deadlineStatus}`;
            const selectedClass = roomData.selected ? ' selected' : '';

            html += `<div class="${className}${selectedClass}" data-room="${room}">`;
            html += `<div class="deadlines-room-number">${room}</div>`;
            html += `</div>`;
        });

        html += `</div></div>`;
    });

    gridEl.innerHTML = html;

    // Добавление обработчиков кликов
    $$('.deadlines-room-item').forEach(item => {
        item.addEventListener('click', () => {
            const room = parseInt(item.getAttribute('data-room'));
            handleRoomClick(room);
        });
    });
}

function getFloorTitle(floor) {
    const titles = {
        5: '5 этаж',
        6: '6 этаж',
        7: '7 этаж',
        8: '8 этаж',
        9: '9 этаж',
        10: '10 этаж',
        11: '11 этаж',
        12: '12 этаж',
        13: '13 этаж',
        14: '14 этаж',
        15: '15 этаж',
        16: '16 этаж',
        17: '17 этаж',
        18: '18 этаж',
        19: '19 этаж'
    };
    return titles[floor] || `${floor} этаж`;
}

function handleRoomClick(roomNumber) {
    const roomData = appData.rooms.find(r => r.number === roomNumber);
    if (!roomData) return;

    if (isSelectMode) {
        // Режим выбора - переключаем выделение
        roomData.selected = !roomData.selected;
        updateSelectedCount();
        renderRooms();
    } else {
        // Обычный режим - открываем модальное окно
        openRoomModal(roomNumber);
    }
}

let isSelectMode = false;
let selectedRooms = [];

function toggleSelectMode() {
    isSelectMode = !isSelectMode;
    const btn = $('#deadlines-select-mode-btn');
    const printBtn = $('#deadlines-print-btn');
    const selectedCountEl = $('#deadlines-selected-count');

    if (isSelectMode) {
        btn.innerHTML = '<i class="fas fa-times"></i> Отменить выбор';
        if (printBtn) printBtn.style.display = 'inline-flex';
        if (selectedCountEl) selectedCountEl.style.display = 'block';
    } else {
        btn.innerHTML = '<i class="fas fa-check-square"></i> Выбрать номера';
        if (printBtn) printBtn.style.display = 'none';
        if (selectedCountEl) selectedCountEl.style.display = 'none';

        // Сброс выделения
        appData.rooms.forEach(room => room.selected = false);
        selectedRooms = [];
    }

    updateSelectedCount();
    renderRooms();
}

function updateSelectedCount() {
    selectedRooms = appData.rooms.filter(r => r.selected).map(r => r.number);
    const countEl = $('#deadlines-selected-number');
    if (countEl) {
        countEl.textContent = selectedRooms.length;
    }
}

function printSelectedRooms() {
    if (selectedRooms.length === 0) return;

    const printContent = selectedRooms.join(', ');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head><title>Выбранные номера</title></head>
        <body>
            <h2>Номера для проверки сроков:</h2>
            <div style="font-size: 18px; line-height: 1.6;">${printContent}</div>
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function resetAllDeadlines() {
    if (!confirm('Сбросить все статусы номеров?')) return;

    appData.rooms.forEach(room => {
        room.deadlineStatus = 'empty';
        room.products = [];
        room.lastChecked = null;
    });

    saveToFirebase();
    renderRooms();
}

function showDeadlinesStats() {
    // Открытие модального окна статистики
    const modal = $('#deadlines-stats-modal');
    if (modal) {
        modal.classList.add('show');
    }

    updateDeadlinesStats();
}

function updateDeadlinesStats() {
    const stats = calculateDeadlinesStats();

    $('#deadlines-count-ok').textContent = stats.ok;
    $('#deadlines-count-products').textContent = stats.products;
    $('#deadlines-count-neutral').textContent = stats.neutral;

    // Статистика по продуктам
    const productsStatsEl = $('#deadlines-products-stats');
    if (productsStatsEl && stats.productStats.length > 0) {
        productsStatsEl.innerHTML = stats.productStats.map(stat =>
            `<div>${stat.name}: ${stat.count}</div>`
        ).join('');
    }
}

function calculateDeadlinesStats() {
    const stats = {
        ok: 0,
        products: 0,
        neutral: 0,
        productStats: []
    };

    const productCounts = {};

    appData.rooms.forEach(room => {
        if (room.deadlineStatus === 'ok') {
            stats.ok++;
        } else if (room.deadlineStatus === 'alert') {
            stats.products++;
            // Подсчет продуктов
            (room.products || []).forEach(product => {
                if (product && product.name) {
                    productCounts[product.name] = (productCounts[product.name] || 0) + 1;
                }
            });
        } else {
            stats.neutral++;
        }
    });

    // Сортировка статистики продуктов
    stats.productStats = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
            name: appData.products[name] || name,
            count
        }));

    return stats;
}

function openRoomModal(roomNumber) {
    const modal = $('#modal');
    const roomTitle = $('#modal-room');
    const productsContainer = $('#modal-products');

    if (!modal || !roomTitle || !productsContainer) return;

    const roomData = appData.rooms.find(r => r.number === roomNumber);
    if (!roomData) return;

    roomTitle.textContent = roomNumber;
    renderRoomProducts(productsContainer, roomData);

    modal.classList.add('show');
}

function renderRoomProducts(container, roomData) {
    const products = getStandardProducts();

    let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px;">';

    products.forEach(product => {
        const existingProduct = roomData.products.find(p => p.name === product.key);
        const count = existingProduct ? existingProduct.count : 0;
        const isSelected = count > 0;

        html += `
            <div class="product-btn${isSelected ? ' active' : ''}" data-product="${product.key}">
                <div class="btn-text">
                    <div style="font-size: 20px;">${product.emoji}</div>
                    <div style="font-size: 12px; margin-top: 4px;">${product.name}</div>
                </div>
                ${count > 0 ? `<div class="product-count">${count}</div>` : '<div class="product-count"></div>'}
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Добавление обработчиков
    $$('.product-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const productKey = btn.getAttribute('data-product');
            toggleProduct(roomData, productKey);
            renderRoomProducts(container, roomData);
        });
    });
}

function getStandardProducts() {
    return Object.entries(appData.products).map(([key, name]) => ({
        key,
        name,
        emoji: PRODUCT_EMOJIS[key] || '📦'
    }));
}

function toggleProduct(roomData, productKey) {
    const existingProduct = roomData.products.find(p => p.name === productKey);

    if (existingProduct) {
        // Увеличиваем счетчик (с учетом лимитов)
        const maxLimit = MULTI_LIMITS[productKey] || 1;
        if (existingProduct.count < maxLimit) {
            existingProduct.count++;
        } else {
            // Удаляем если достигнут лимит
            roomData.products = roomData.products.filter(p => p.name !== productKey);
        }
    } else {
        // Добавляем новый продукт
        roomData.products.push({
            name: productKey,
            count: 1
        });
    }

    // Обновляем статус комнаты
    updateRoomStatus(roomData);
    saveToFirebase();
}

function updateRoomStatus(roomData) {
    const hasProducts = roomData.products && roomData.products.length > 0;

    if (hasProducts) {
        roomData.deadlineStatus = 'alert';
    } else {
        roomData.deadlineStatus = 'ok';
    }

    roomData.lastChecked = new Date().toISOString();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSroki);
} else {
    initSroki();
}


