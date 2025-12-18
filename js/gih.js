// Инициализация страницы GIH
function initGih() {
    console.log('Инициализация страницы GIH');

    // Инициализация данных
    initGihData();

    // Инициализация обработчиков
    initGihListeners();

    // Рендеринг данных
    renderGihRecords();
    updateGIHSummary();
    updateGIHRoomsSummary();
}

function initGihData() {
    if (!appData.gihRecords) {
        appData.gihRecords = [];
    }
    if (!appData.gihHistory) {
        appData.gihHistory = [];
    }
}

function initGihListeners() {
    // Кнопка добавления новой записи
    const addBtn = $('#add-gih-btn');
    if (addBtn) {
        addBtn.addEventListener('click', showGihForm);
    }

    // Форма GIH
    const cancelBtn = $('#cancel-gih');
    const saveBtn = $('#save-gih');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideGihForm);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', saveGihRecord);
    }

    // Кнопка сортировки
    const sortBtn = $('#gih-sort-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', toggleGihSort);
    }

    // Кнопка печати
    const printBtn = $('#print-gih-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printGihRecords);
    }

    // Инициализация перетаскивания продуктов
    initGihProductsArea();

    // Обработка кликов по комнатам в сводке
    const roomsSummary = $('#gih-rooms-summary');
    if (roomsSummary) {
        roomsSummary.addEventListener('click', () => {
            toggleRoomsSummary();
        });
    }

    // Обработка кликов по продуктам в сводке
    const summary = $('#gih-summary');
    if (summary) {
        summary.addEventListener('click', () => {
            toggleProductsSummary();
        });
    }
}

function showGihForm() {
    const form = $('#gih-form');
    const roomInput = $('#gih-room');

    if (form) {
        form.style.display = 'block';
        if (roomInput) roomInput.focus();
    }
}

function hideGihForm() {
    const form = $('#gih-form');
    const roomInput = $('#gih-room');
    const productsArea = $('#gih-products-area');

    if (form) {
        form.style.display = 'none';
        if (roomInput) roomInput.value = '';
        if (productsArea) productsArea.innerHTML = '';
    }
}

function saveGihRecord() {
    const roomInput = $('#gih-room');
    const productsArea = $('#gih-products-area');

    if (!roomInput || !productsArea) return;

    const roomNumber = parseInt(roomInput.value.trim());
    if (!roomNumber || roomNumber < 100 || roomNumber > 19999) {
        alert('Введите корректный номер комнаты');
        return;
    }

    // Проверяем, существует ли уже запись для этой комнаты
    const existingRecord = appData.gihRecords.find(r => r.room === roomNumber || r.number === roomNumber);
    if (existingRecord) {
        if (!confirm(`Запись для номера ${roomNumber} уже существует. Обновить?`)) {
            return;
        }
    }

    // Собираем продукты
    const products = [];
    $$('.product-btn.active', productsArea).forEach(btn => {
        const productKey = btn.getAttribute('data-product');
        const countEl = btn.querySelector('.product-count');
        const count = countEl && countEl.textContent ? parseInt(countEl.textContent) : 1;

        if (productKey && count > 0) {
            products.push({
                name: productKey,
                count: count
            });
        }
    });

    const record = {
        id: Date.now(),
        room: roomNumber,
        number: roomNumber,
        products: products,
        createdAt: new Date().toISOString(),
        savedAt: new Date().toISOString()
    };

    // Добавляем в историю
    appData.gihHistory.unshift(record);

    // Обновляем текущие записи
    const existingIndex = appData.gihRecords.findIndex(r => r.room === roomNumber || r.number === roomNumber);
    if (existingIndex >= 0) {
        appData.gihRecords[existingIndex] = record;
    } else {
        appData.gihRecords.push(record);
    }

    saveToFirebase();
    hideGihForm();
    renderGihRecords();
    updateGIHSummary();
    updateGIHRoomsSummary();
}

function toggleGihSort() {
    const btn = $('#gih-sort-btn');
    const icon = btn ? btn.querySelector('i') : null;

    // TODO: Реализовать логику сортировки
    if (icon) {
        if (icon.classList.contains('fa-sort-numeric-down')) {
            icon.classList.remove('fa-sort-numeric-down');
            icon.classList.add('fa-sort-numeric-up');
        } else {
            icon.classList.remove('fa-sort-numeric-up');
            icon.classList.add('fa-sort-numeric-down');
        }
    }

    renderGihRecords();
}

function printGihRecords() {
    // TODO: Реализовать печать
    alert('Функция печати будет реализована');
}

function initGihProductsArea() {
    const productsArea = $('#gih-products-area');
    if (!productsArea) return;

    // Создаем продукты для выбора
    renderGihProductButtons(productsArea);
}

function renderGihProductButtons(container) {
    const products = getStandardProducts();

    let html = '<div style="display: flex; gap: 8px; flex-wrap: wrap;">';

    products.forEach(product => {
        html += `
            <div class="product-btn" data-product="${product.key}">
                <div class="btn-text">
                    <div style="font-size: 18px;">${product.emoji}</div>
                    <div style="font-size: 11px; margin-top: 2px;">${product.name}</div>
                </div>
                <div class="product-count"></div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Добавление обработчиков
    $$('.product-btn', container).forEach(btn => {
        btn.addEventListener('click', () => {
            const productKey = btn.getAttribute('data-product');
            toggleGihProduct(btn, productKey);
        });
    });
}

function toggleGihProduct(btn, productKey) {
    const countEl = btn.querySelector('.product-count');
    let count = countEl.textContent ? parseInt(countEl.textContent) : 0;
    const maxLimit = MULTI_LIMITS[productKey] || 1;

    if (btn.classList.contains('active')) {
        // Уменьшаем счетчик
        count--;
        if (count <= 0) {
            btn.classList.remove('active');
            countEl.textContent = '';
        } else {
            countEl.textContent = count;
        }
    } else {
        // Увеличиваем счетчик
        count++;
        if (count <= maxLimit) {
            btn.classList.add('active');
            countEl.textContent = count > 1 ? count : '';
        }
    }
}

function renderGihRecords() {
    const container = $('#gih-records');
    if (!container) return;

    if (appData.gihRecords.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">Нет записей GIH</div>';
        return;
    }

    // Сортировка (пока по номеру комнаты)
    const sortedRecords = [...appData.gihRecords].sort((a, b) => (a.room || a.number) - (b.room || b.number));

    let html = '';
    sortedRecords.forEach(record => {
        html += renderGihRecord(record);
    });

    container.innerHTML = html;
}

function renderGihRecord(record) {
    const roomNumber = record.room || record.number;
    const savedAt = record.savedAt ? new Date(record.savedAt).toLocaleDateString('ru-RU') : '';

    let html = `
        <div class="gih-card" data-id="${record.id}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 600;">Номер ${roomNumber}</div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    ${savedAt ? `<div class="saved-at">Сохранено ${savedAt}</div>` : ''}
                    <button class="btn ghost small" onclick="editGihRecord(${record.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn ghost small" onclick="deleteGihRecord(${record.id})" style="color: #e53e3e;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
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

function editGihRecord(recordId) {
    const record = appData.gihRecords.find(r => r.id === recordId);
    if (!record) return;

    // Заполняем форму данными записи
    const roomInput = $('#gih-room');
    const productsArea = $('#gih-products-area');

    if (roomInput) roomInput.value = record.room || record.number;
    if (productsArea) {
        renderGihProductButtons(productsArea);

        // Устанавливаем выбранные продукты
        (record.products || []).forEach(product => {
            const btn = $(`.product-btn[data-product="${product.name}"]`, productsArea);
            if (btn) {
                btn.classList.add('active');
                const countEl = btn.querySelector('.product-count');
                if (countEl && product.count > 1) {
                    countEl.textContent = product.count;
                }
            }
        });
    }

    showGihForm();
}

function deleteGihRecord(recordId) {
    if (!confirm('Удалить запись?')) return;

    appData.gihRecords = appData.gihRecords.filter(r => r.id !== recordId);
    saveToFirebase();
    renderGihRecords();
    updateGIHSummary();
    updateGIHRoomsSummary();
}

function updateGIHSummary() {
    const summaryEl = $('#gih-summary');
    const listEl = $('#gih-summary-list');

    if (!summaryEl || !listEl) return;

    // Считаем все продукты
    const counts = {};
    (appData.gihRecords || []).forEach(rec => {
        (rec.products || []).forEach(p => {
            if (p && p.name) {
                counts[p.name] = (counts[p.name] || 0) + (p.count || 1);
            }
        });
    });

    // Если нет данных, скрываем блок
    const entries = Object.entries(counts);
    if (entries.length === 0) {
        summaryEl.style.display = "none";
        listEl.innerHTML = "";
        return;
    }

    // Сортируем по убыванию
    entries.sort((a, b) => b[1] - a[1]);

    // Формируем HTML-список
    const htmlParts = entries.map(([key, count]) => {
        const name = appData.products[key] || key;
        return `<div><strong>${name}</strong> x${count}</div>`;
    });

    listEl.innerHTML = htmlParts.join("");
    summaryEl.style.display = "block";
}

function updateGIHRoomsSummary() {
    const cont = $('#gih-rooms-summary');
    const list = $('#gih-rooms-summary-list');
    const savedEl = $('#rooms-saved-count');
    const totalEl = $('#rooms-total-count');

    if (!cont || !list) return;

    const records = (appData && appData.gihRecords) ? appData.gihRecords : [];
    const total = records.length;
    const saved = records.filter(r => r && r.savedAt).length; // считаем по savedAt

    // counters
    if (savedEl) savedEl.textContent = String(saved);
    if (totalEl) totalEl.textContent = String(total);

    // empty state hides the block (consistently with products summary)
    if (total === 0) {
        cont.style.display = 'none';
        list.innerHTML = '';
        return;
    } else {
        cont.style.display = 'block';
    }

    // chips
    let html = '';
    records.forEach((rec, i) => {
        const isSaved = !!rec.savedAt;
        const label = (rec && (rec.room || rec.number)) ? (rec.room || rec.number) : ('#' + (i + 1));
        const savedClass = isSaved ? ' saved' : '';
        html += '<div class="room-chip' + savedClass + '" data-id="' + rec.id + '">' + label + '</div>';
    });
    list.innerHTML = html;

    // Добавление обработчиков кликов по чипам
    $$('.room-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const id = parseInt(chip.getAttribute('data-id'));
            const card = $('.gih-card[data-id="' + id + '"]');
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.style.animation = 'gihCardFlash 0.8s ease-out';
                setTimeout(() => card.style.animation = '', 800);
            }
        });
    });
}

function toggleProductsSummary() {
    const list = $('#gih-summary-list');
    if (list) {
        const isCollapsed = list.style.maxHeight === '0px' || !list.style.maxHeight;
        list.style.maxHeight = isCollapsed ? '2000px' : '0px';
        list.style.opacity = isCollapsed ? '1' : '0';

        const arrow = $('#gih-summary-arrow');
        if (arrow) {
            arrow.style.transform = isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)';
        }
    }
}

function toggleRoomsSummary() {
    const list = $('#gih-rooms-summary-list');
    if (list) {
        const isCollapsed = list.style.maxHeight === '0px' || !list.style.maxHeight;
        list.style.maxHeight = isCollapsed ? '2000px' : '0px';
        list.style.opacity = isCollapsed ? '1' : '0';

        const arrow = $('#gih-rooms-summary-arrow');
        if (arrow) {
            arrow.style.transform = isCollapsed ? 'rotate(90deg)' : 'rotate(0deg)';
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGih);
} else {
    initGih();
}


