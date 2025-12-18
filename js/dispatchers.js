// Инициализация страницы Депатчеры
function initDispatchers() {
    console.log('Инициализация страницы Депатчеры');

    // Инициализация выбора файла
    initFileSelection();

    // Инициализация кнопок сортировки
    initSorting();

    // Загрузка сегодняшних номеров
    loadTodayRooms();
}

function initFileSelection() {
    const fileInput = $('#dispatchers-pdfFile');
    const selectBtn = $('#dispatchers-selectFileBtn');
    const fileNameEl = $('#dispatchers-fileName');

    if (selectBtn && fileInput) {
        selectBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                fileNameEl.textContent = file.name;
                processPDFFile(file);
            }
        });
    }
}

function initSorting() {
    const sortBtn = $('#dispatchers-sort-toggle');
    const sortBtnMobile = $('#dispatchers-sort-toggle-mobile');
    const sortLabels = $$('.dispatchers-sort-label, #dispatchers-sort-label, #dispatchers-sort-label-mobile');

    const handleSort = () => {
        // Переключение сортировки по времени/номеру
        // TODO: Реализовать логику сортировки
    };

    if (sortBtn) sortBtn.addEventListener('click', handleSort);
    if (sortBtnMobile) sortBtnMobile.addEventListener('click', handleSort);
}

async function processPDFFile(file) {
    const resultEl = $('#dispatchers-result');
    if (!resultEl) return;

    try {
        resultEl.innerHTML = '<div class="dispatchers-loading">Обработка файла...</div>';

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let allRooms = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const text = textContent.items.map(item => item.str).join(' ');

            const rooms = extractRoomsFromText(text);
            allRooms = allRooms.concat(rooms);
        }

        const uniqueRooms = [...new Set(allRooms)].sort();

        renderDispatchersResult(uniqueRooms);

    } catch (error) {
        console.error('Error processing PDF:', error);
        resultEl.innerHTML = '<div class="dispatchers-error">Ошибка обработки файла: ' + error.message + '</div>';
    }
}

function extractRoomsFromText(text) {
    // Регулярные выражения для поиска номеров комнат
    const roomPatterns = [
        /\b(\d{3,4})\b/g,  // 3-4 цифры
        /\b(\d{2,3}[A-Z]?)\b/g, // 2-3 цифры с возможной буквой
    ];

    const rooms = [];
    const seen = new Set();

    roomPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const room = match[1];
            // Фильтрация: только валидные номера комнат из списка
            if (!seen.has(room) && appData.roomsList.includes(parseInt(room))) {
                rooms.push(room);
                seen.add(room);
            }
        }
    });

    return rooms;
}

function renderDispatchersResult(rooms) {
    const resultEl = $('#dispatchers-result');
    if (!resultEl) return;

    const stats = calculateDispatchersStats(rooms);

    let html = '<div class="dispatchers-stats">';
    html += `<div class="dispatchers-stat-item">`;
    html += `<div class="dispatchers-stat-value">${stats.total}</div>`;
    html += `<div class="dispatchers-stat-label">Всего номеров</div>`;
    html += `</div>`;

    html += `<div class="dispatchers-stat-item">`;
    html += `<div class="dispatchers-stat-value">${stats.todayChecked}</div>`;
    html += `<div class="dispatchers-stat-label">Проверено сегодня</div>`;
    html += `</div>`;

    html += `<div class="dispatchers-stat-item">`;
    html += `<div class="dispatchers-stat-value">${stats.remaining}</div>`;
    html += `<div class="dispatchers-stat-label">Осталось</div>`;
    html += `</div>`;
    html += `</div>`;

    // Список номеров
    html += '<div style="margin-top:15px;">';
    html += '<h4 style="margin-bottom:10px;">Найденные номера:</h4>';
    html += '<div class="dispatchers-room-list">';

    rooms.forEach(room => {
        const isChecked = isRoomCheckedToday(room);
        const className = isChecked ? 'dispatchers-room-item found' : 'dispatchers-room-item';
        html += `<div class="${className}" data-room="${room}">`;
        html += `<span class="room-number">${room}</span>`;
        if (isChecked) {
            html += '<i class="fas fa-check" style="color:#1b7a2b;"></i>';
        }
        html += `</div>`;
    });

    html += '</div>';
    html += '</div>';

    resultEl.innerHTML = html;

    // Добавление обработчиков кликов
    $$('.dispatchers-room-item').forEach(item => {
        item.addEventListener('click', () => {
            const room = item.getAttribute('data-room');
            toggleRoomSelection(room);
        });
    });
}

function calculateDispatchersStats(rooms) {
    const todayChecked = rooms.filter(room => isRoomCheckedToday(room)).length;
    return {
        total: rooms.length,
        todayChecked: todayChecked,
        remaining: rooms.length - todayChecked
    };
}

function isRoomCheckedToday(room) {
    // Проверка, был ли номер проверен сегодня
    // TODO: Реализовать проверку на основе данных
    return false;
}

function toggleRoomSelection(room) {
    // Логика выбора/исключения номера
    // TODO: Реализовать
    console.log('Toggle room:', room);
}

async function loadTodayRooms() {
    const statusEl = $('#dispatchers-today-rooms-status');
    const listEl = $('#dispatchers-today-rooms-list');

    if (!statusEl || !listEl) return;

    try {
        // Загрузка сегодняшних номеров из backend
        const response = await fetch('/today-rooms');
        if (response.ok) {
            const data = await response.json();
            renderTodayRooms(data.rooms || []);
        } else {
            statusEl.textContent = 'Ошибка загрузки данных';
        }
    } catch (error) {
        console.error('Error loading today rooms:', error);
        statusEl.textContent = 'Ошибка подключения';
    }
}

function renderTodayRooms(rooms) {
    const listEl = $('#dispatchers-today-rooms-list');
    const titleEl = $('#dispatchers-today-rooms-title');

    if (!listEl || !titleEl) return;

    titleEl.textContent = `Уже проверено (${rooms.length}):`;

    if (rooms.length === 0) {
        listEl.innerHTML = '<div style="color:#666; font-style:italic;">Нет проверенных номеров</div>';
        return;
    }

    listEl.innerHTML = rooms.map(room => `
        <div class="dispatchers-today-room-card found">
            <div class="dispatchers-today-room-number">${room.number || room}</div>
            <div class="dispatchers-today-room-time">${room.time || '00:00'}</div>
        </div>
    `).join('');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDispatchers);
} else {
    initDispatchers();
}


