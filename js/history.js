// Инициализация страницы История
function initHistory() {
    console.log('Инициализация страницы История');

    // Инициализация данных истории
    initHistoryData();

    // Установка текущей даты
    currentHistoryDate = new Date();

    // Инициализация обработчиков
    initHistoryListeners();

    // Загрузка данных за текущий день
    loadHistoryForDate(currentHistoryDate);
}

let currentHistoryDate = new Date();

function initHistoryData() {
    if (!appData.gihHistory) {
        appData.gihHistory = [];
    }
}

function initHistoryListeners() {
    // Кнопки навигации по датам
    const prevBtn = $('#history-prev-day');
    const nextBtn = $('#history-next-day');
    const currentDateEl = $('#history-current-date');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            changeHistoryDate(-1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            changeHistoryDate(1);
        });
    }

    if (currentDateEl) {
        currentDateEl.addEventListener('click', showDatePicker);
    }

    // Поиск
    const searchBtn = $('#history-search-btn');
    const searchInput = $('#history-search-input');
    const searchWrapper = $('#history-search-wrapper');
    const clearBtn = $('#history-search-clear');

    if (searchBtn) {
        searchBtn.addEventListener('click', toggleSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearch);
    }

    // Кнопка печати
    const printBtn = $('#print-history-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printHistory);
    }
}

function changeHistoryDate(delta) {
    currentHistoryDate.setDate(currentHistoryDate.getDate() + delta);
    loadHistoryForDate(currentHistoryDate);

    // Обновляем состояние кнопки "далее"
    const nextBtn = $('#history-next-day');
    const today = new Date();
    const isFuture = currentHistoryDate > today;
    if (nextBtn) {
        nextBtn.disabled = isFuture;
    }
}

function loadHistoryForDate(date) {
    updateDateDisplay(date);

    // Получаем записи за выбранную дату
    const dateStr = date.toISOString().split('T')[0];
    const dayRecords = appData.gihHistory.filter(record => {
        if (!record.createdAt) return false;
        const recordDate = new Date(record.createdAt).toISOString().split('T')[0];
        return recordDate === dateStr;
    });

    renderHistoryRecords(dayRecords, date);
}

function updateDateDisplay(date) {
    const dateEl = $('#history-current-date');
    if (dateEl) {
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        dateEl.textContent = date.toLocaleDateString('ru-RU', options);
    }
}

function renderHistoryRecords(records, date) {
    const container = $('#history-list');
    if (!container) return;

    if (records.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">Нет записей за этот день</div>';
        return;
    }

    // Группировка по времени создания
    const groupedRecords = {};
    records.forEach(record => {
        const time = new Date(record.createdAt).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });

        if (!groupedRecords[time]) {
            groupedRecords[time] = [];
        }
        groupedRecords[time].push(record);
    });

    let html = '';

    // Сортировка по времени (новые сверху)
    Object.keys(groupedRecords).sort().reverse().forEach(time => {
        const timeRecords = groupedRecords[time];

        html += `<div class="history-date-header">${time}</div>`;

        timeRecords.forEach(record => {
            html += renderHistoryRecord(record);
        });
    });

    container.innerHTML = html;
}

function renderHistoryRecord(record) {
    const roomNumber = record.room || record.number;
    const savedAt = record.savedAt ? new Date(record.savedAt).toLocaleString('ru-RU') : '';

    let html = `
        <div class="gih-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 600;">Номер ${roomNumber}</div>
                ${savedAt ? `<div class="saved-at">Сохранено ${savedAt}</div>` : ''}
            </div>
    `;

    if (record.products && record.products.length > 0) {
        html += '<div class="gih-products">';
        record.products.forEach(product => {
            const productName = appData.products[product.name] || product.name;
            const emoji = PRODUCT_EMOJIS[product.name] || '📦';
            const count = product.count > 1 ? ` x${product.count}` : '';

            html += `<div class="gih-product">${emoji} ${productName}${count}</div>`;
        });
        html += '</div>';
    }

    html += '</div>';
    return html;
}

function toggleSearch() {
    const wrapper = $('#history-search-wrapper');
    const input = $('#history-search-input');
    const btn = $('#history-search-btn');

    if (input.style.width === '0px' || !input.style.width) {
        // Показать поиск
        input.style.width = '200px';
        input.style.opacity = '1';
        input.focus();
        if (btn) btn.style.display = 'none';
    } else {
        // Скрыть поиск
        performSearch();
    }
}

function handleSearch() {
    const input = $('#history-search-input');
    const clearBtn = $('#history-search-clear');

    if (input && input.value.trim()) {
        if (clearBtn) clearBtn.style.display = 'inline-flex';
    } else {
        if (clearBtn) clearBtn.style.display = 'none';
    }
}

function performSearch() {
    const input = $('#history-search-input');
    const container = $('#history-list');

    if (!input || !container) return;

    const searchTerm = input.value.trim().toLowerCase();

    if (!searchTerm) {
        // Возврат к обычному виду
        container.classList.remove('search-active');
        loadHistoryForDate(currentHistoryDate);
        return;
    }

    // Поиск по всем записям истории
    const allRecords = appData.gihHistory.filter(record => {
        const roomNumber = String(record.room || record.number).toLowerCase();
        return roomNumber.includes(searchTerm);
    });

    container.classList.add('search-active');

    if (allRecords.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">Ничего не найдено</div>';
        return;
    }

    let html = '';
    allRecords.forEach(record => {
        const date = new Date(record.createdAt).toLocaleDateString('ru-RU');
        html += `<div class="history-date-header">Найдено в ${date}</div>`;
        html += renderHistoryRecord(record);
    });

    container.innerHTML = html;
}

function clearSearch() {
    const input = $('#history-search-input');
    const clearBtn = $('#history-search-clear');

    if (input) input.value = '';
    if (clearBtn) clearBtn.style.display = 'none';

    $('#history-list').classList.remove('search-active');
    loadHistoryForDate(currentHistoryDate);
}

function showDatePicker() {
    // TODO: Реализовать кастомный календарь для выбора даты
    alert('Календарь будет реализован в следующей версии');
}

function printHistory() {
    const container = $('#history-list');
    if (!container) return;

    const printWindow = window.open('', '_blank');
    const dateStr = currentHistoryDate.toLocaleDateString('ru-RU');

    printWindow.document.write(`
        <html>
        <head>
            <title>История GIH - ${dateStr}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .gih-card { border: 1px solid #ccc; padding: 10px; margin: 10px 0; border-radius: 5px; }
                .gih-products { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
                .gih-product { background: #f0f0f0; padding: 3px 6px; border-radius: 3px; font-size: 12px; }
                .history-date-header { font-weight: bold; margin: 15px 0 5px 0; padding-bottom: 3px; border-bottom: 1px solid #ccc; }
            </style>
        </head>
        <body>
            <h1>История GIH - ${dateStr}</h1>
            ${container.innerHTML}
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.print();
}

// Глобальная функция для вызова из common.js
window.renderHistory = renderHistoryRecords;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHistory);
} else {
    initHistory();
}


