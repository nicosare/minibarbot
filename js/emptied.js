// Инициализация страницы Пустые
function initEmptied() {
    console.log('Инициализация страницы Пустые');

    // Инициализация обработчиков
    initEmptiedListeners();

    // Загрузка пустых номеров
    loadEmptiedRooms();
}

function initEmptiedListeners() {
    // Кнопка сортировки
    const sortBtn = $('#emptied-sort-toggle');
    if (sortBtn) {
        sortBtn.addEventListener('click', toggleEmptiedSort);
    }
}

function toggleEmptiedSort() {
    const btn = $('#emptied-sort-toggle');
    const label = $('#emptied-sort-label');

    // Переключение между сортировками
    // TODO: Реализовать разные типы сортировки
    if (label) {
        if (label.textContent === 'По времени') {
            label.textContent = 'По номеру';
        } else {
            label.textContent = 'По времени';
        }
    }

    loadEmptiedRooms();
}

async function loadEmptiedRooms() {
    const statusEl = $('#emptied-status');
    const listEl = $('#emptied-rooms-list');
    const totalCountEl = $('#emptied-total-count');

    if (!statusEl || !listEl) return;

    try {
        // Загрузка пустых номеров из backend
        const response = await fetch('/emptied-rooms');
        if (response.ok) {
            const data = await response.json();
            renderEmptiedRooms(data.rooms || []);
            if (totalCountEl) {
                totalCountEl.textContent = (data.rooms || []).length;
            }
        } else {
            statusEl.textContent = 'Ошибка загрузки данных';
        }
    } catch (error) {
        console.error('Error loading emptied rooms:', error);
        statusEl.textContent = 'Ошибка подключения';
    }
}

function renderEmptiedRooms(rooms) {
    const listEl = $('#emptied-rooms-list');
    if (!listEl) return;

    if (rooms.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #666; padding: 40px;">Нет пустых номеров</div>';
        return;
    }

    // Группировка по этажам
    const floors = {};
    rooms.forEach(room => {
        const floor = Math.floor(room.number / 100);
        if (!floors[floor]) floors[floor] = [];
        floors[floor].push(room);
    });

    let html = '';
    Object.keys(floors).sort((a, b) => a - b).forEach(floor => {
        const floorRooms = floors[floor];
        const floorTitle = getFloorTitle(floor);

        html += `<div class="dispatchers-floor-section">`;
        html += `<div class="dispatchers-floor-title">${floorTitle}</div>`;
        html += `<div class="dispatchers-room-list">`;

        floorRooms.forEach(room => {
            const roomNumber = room.number || room;
            const time = room.time || room.lastEmptied;

            html += `<div class="dispatchers-today-room-card">`;
            html += `<div class="dispatchers-today-room-number">${roomNumber}</div>`;
            if (time) {
                const timeStr = typeof time === 'string' ? time : new Date(time).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                html += `<div class="dispatchers-today-room-time">${timeStr}</div>`;
            }
            html += `<div class="dispatchers-today-room-empty">∅</div>`;
            html += `</div>`;
        });

        html += `</div></div>`;
    });

    listEl.innerHTML = html;
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEmptied);
} else {
    initEmptied();
}


