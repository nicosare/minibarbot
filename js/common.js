// ===== ОБЩИЕ ФУНКЦИИ =====

// Утилиты для работы с DOM
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

// Копирование текста в буфер обмена
function copyText(textToCopy) {
    navigator.clipboard.writeText(textToCopy);
}

// ===== FIREBASE CONFIGURATION =====
const firebaseConfig = {
    apiKey: "AIzaSyCcVgoGZ6MnjQOghbYRmnvITPU-O-zDYao",
    authDomain: "minibars-17502.firebaseapp.com",
    databaseURL: "https://minibars-17502-default-rtdb.firebaseio.com",
    projectId: "minibars-17502",
    storageBucket: "minibars-17502.firebasestorage.app",
    messagingSenderId: "464067936838",
    appId: "1:464067936838:web:f6c37ecf3ec4ae5d598047"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Firebase connection status
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const mobileIndicator = document.getElementById('mobileConnectionIndicator');

    if (connected) {
        if (statusEl) {
            statusEl.classList.remove('disconnected');
            statusEl.classList.add('connected');
            statusEl.querySelector('.text').textContent = 'Синхронизировано';
        }
        if (mobileIndicator) {
            mobileIndicator.classList.remove('disconnected');
            mobileIndicator.classList.add('connected');
        }
    } else {
        if (statusEl) {
            statusEl.classList.remove('connected');
            statusEl.classList.add('disconnected');
            statusEl.querySelector('.text').textContent = 'Оффлайн';
        }
        if (mobileIndicator) {
            mobileIndicator.classList.remove('connected');
            mobileIndicator.classList.add('disconnected');
        }
    }
}

// Listen for connection status changes
firebase.database().ref('.info/connected').on('value', (snapshot) => {
    updateConnectionStatus(snapshot.val() === true);
});

// ===== DATA & CONFIG =====
const appData = {
    accises: [],
    rooms: [],
    selectedRoom: null,
    roomProducts: {
        standard: ['twix', 'pepper', 'redbull', 'cola', 'baikal', 'borjomi', 'apple', 'tomato', 'corona', 'stella'],
        lux: ['twix', 'redbull', 'orange', 'cherry', 'apple', 'tomato', 'borjomi', 'cola', 'stella', 'corona']
    },
    gihRecords: [],
    gihHistory: [],
    products: {
        twix: 'Твикс', jager: 'Ягер', gin: 'Джин', rum: 'Ром', cognac: 'Коньяк',
        whiskey: 'Виски', vodka: 'Водка', pepper: 'Пеппер', redbull: 'Ред Булл',
        cola: 'Кола', baikal: 'Байкал', borjomi: 'Боржоми', white_wine: 'Белое вино',
        red_wine: 'Красное вино', apple: 'Яблоко', tomato: 'Томат', corona: 'Корона',
        stella: 'Стелла', gancha: 'Ганча', martini: 'Мартини', orange: 'Апельсин',
        cherry: 'Вишня', loriot: 'Лориот', whiskey02: 'Виски 0.2'
    },
    roomsList: [500, 502, 504, 506, 508, 509, 510, 512, 514, 516, 518, 520, 522, 524, 526, 528, 530, 532, 534, 600, 602, 604, 606, 608, 609, 610, 612, 614, 616, 618, 620, 622, 624, 626, 628, 630, 632, 634, 700, 702, 704, 706, 708, 709, 710, 712, 714, 716, 717, 718, 720, 722, 724, 725, 726, 728, 730, 732, 734, 800, 802, 804, 806, 808, 809, 810, 812, 814, 816, 817, 818, 820, 822, 824, 825, 826, 828, 830, 832, 834, 900, 902, 904, 906, 908, 909, 910, 912, 914, 916, 917, 918, 920, 922, 924, 925, 926, 928, 930, 932, 934, 1000, 1002, 1004, 1006, 1008, 1009, 1010, 1012, 1014, 1016, 1017, 1018, 1020, 1022, 1024, 1025, 1026, 1028, 1030, 1032, 1034, 1100, 1102, 1104, 1106, 1108, 1109, 1110, 1112, 1114, 1116, 1117, 1118, 1120, 1122, 1124, 1125, 1126, 1128, 1130, 1132, 1134, 1200, 1202, 1204, 1206, 1208, 1209, 1210, 1212, 1214, 1216, 1217, 1218, 1220, 1222, 1224, 1225, 1226, 1228, 1230, 1232, 1234, 1300, 1302, 1304, 1306, 1308, 1309, 1310, 1312, 1314, 1316, 1317, 1318, 1320, 1322, 1324, 1325, 1326, 1328, 1330, 1332, 1334, 1400, 1402, 1404, 1406, 1408, 1409, 1410, 1412, 1414, 1416, 1417, 1418, 1420, 1422, 1424, 1425, 1426, 1428, 1430, 1432, 1434, 1500, 1502, 1504, 1506, 1508, 1509, 1510, 1512, 1514, 1516, 1517, 1518, 1520, 1522, 1524, 1525, 1526, 1528, 1530, 1532, 1534, 1600, 1602, 1604, 1606, 1608, 1609, 1610, 1612, 1614, 1616, 1617, 1618, 1620, 1622, 1624, 1625, 1626, 1628, 1630, 1632, 1634, 1700, 1702, 1704, 1706, 1708, 1709, 1710, 1712, 1714, 1716, 1717, 1718, 1720, 1722, 1724, 1725, 1726, 1728, 1730, 1732, 1734, 1800, 1802, 1804, 1806, 1807, 1808, 1810, 1811, 1812, 1814, 1816, 1818, 1902, 1904, 1906, 1908, 1910, 1911, 1912, 1914, 1916, 1918, 1919, 1920],
    dispatchersSelectedRooms: []
};

// Emoji map for product buttons
const PRODUCT_EMOJIS = {
    twix: "🍫",
    jager: "🦌",
    gin: "🍸",
    rum: "🏴‍☠️",
    cognac: "🥃",
    whiskey: "🥃",
    whiskey02: "🥃",
    vodka: "🍶",
    pepper: "🌶️",
    redbull: "⚡",
    cola: "🥤",
    baikal: "💧",
    borjomi: "🫧",
    white_wine: "🥂",
    red_wine: "🍷",
    corona: "🍺",
    stella: "🍺",
    gancha: "🍹",
    martini: "🍸",
    loriot: "🍾",
    apple: "🍏",
    tomato: "🍅",
    orange: "🍊",
    cherry: "🍒"
};

// Which products have multi-select limits
const MULTI_LIMITS = {
    jager: 2,
    gin: 2,
    vodka: 2,
    whiskey: 3,
    pepper: 2,
    redbull: 2,
    cola: 2,
    baikal: 2,
    borjomi: 2
};

// Флаг для предотвращения повторной отрисовки
let isRendering = false;

// Firebase synchronization
let isUpdatingFromFirebase = false;

// Save data to Firebase
async function saveToFirebase() {
    if (isUpdatingFromFirebase) return;
    
    try {
        // Всегда сохраняем в localStorage
        localStorage.setItem('hotelMinibarData', JSON.stringify(appData));
        
        // Безопасное сохранение в Firebase с мержем истории
        const serverSnap = await database.ref('minibarData/gihHistory').once('value');
        const serverHistory = Array.isArray(serverSnap.val()) ? serverSnap.val() : (serverSnap.val() || []);
        const localHistory = Array.isArray(appData.gihHistory) ? appData.gihHistory : (appData.gihHistory || []);
        
        const byId = new Map();
        [...serverHistory, ...localHistory].forEach(item => {
            if (item && item.id != null && !byId.has(item.id)) byId.set(item.id, item);
        });
        const mergedHistory = Array.from(byId.values());
        
        const dataToSave = { ...appData, gihHistory: mergedHistory };
        await database.ref('minibarData').set(dataToSave);
        console.log('Данные (с объединённой историей) сохранены в Firebase и localStorage');
    } catch (error) {
        console.error('Ошибка сохранения в Firebase (данные остались в localStorage):', error);
    }
}

// Load data from Firebase
async function loadFromFirebase() {
    try {
        console.log('Loading data from Firebase...');
        const snapshot = await database.ref('minibarData').once('value');
        const data = snapshot.val();
        console.log('Firebase data:', data);

        if (data) {
            isUpdatingFromFirebase = true;
            Object.assign(appData, data);
            localStorage.setItem('hotelMinibarData', JSON.stringify(appData));
            isUpdatingFromFirebase = false;
            console.log('Data loaded and assigned to appData');

            updateUIFromData();
        } else {
            console.log('No data in Firebase, using localStorage');
            // Если нет данных в Firebase, используем localStorage
            const saved = localStorage.getItem('hotelMinibarData');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    Object.assign(appData, parsed);
                    updateUIFromData();
                } catch (e) {
                    console.error('Error loading from localStorage:', e);
                }
            }
        }
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('hotelMinibarData');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(appData, parsed);
                updateUIFromData();
            } catch (e) {
                console.error('Error loading from localStorage:', e);
            }
        }
    }
}

// Load from localStorage on startup
if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('hotelMinibarData');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(appData, parsed);
        } catch (e) {
            console.error('Error loading from localStorage:', e);
        }
    }
}

// Listen for real-time updates from Firebase
function setupFirebaseListener() {
    database.ref('minibarData').on('value', (snapshot) => {
        const data = snapshot.val();

        if (data && !isUpdatingFromFirebase) {
            console.log('Получены обновления из Firebase');
            isUpdatingFromFirebase = true;

            const currentHistory = appData.gihHistory || [];
            Object.assign(appData, data);

            if (currentHistory.length > 0 && (!appData.gihHistory || appData.gihHistory.length < currentHistory.length)) {
                console.log('Восстанавливаем историю из локальной копии');
                appData.gihHistory = currentHistory;
            }

            localStorage.setItem('hotelMinibarData', JSON.stringify(appData));
            isUpdatingFromFirebase = false;

            updateUIFromData();
        }
    });
}

// Update UI when data changes
function updateUIFromData() {
    // Сортируем продукты по исходному порядку из appData.products
    if (appData.products && typeof appData.products === 'object') {
        const originalOrder = [
            "twix", "jager", "gin", "rum", "cognac", "whiskey", "vodka", "pepper",
            "redbull", "cola", "baikal", "borjomi", "white_wine", "red_wine", "apple",
            "tomato", "corona", "stella", "gancha", "martini", "orange", "cherry",
            "loriot", "whiskey02"
        ];

        appData.products = Object.fromEntries(
            Object.entries(appData.products).sort((a, b) => {
                const ia = originalOrder.indexOf(a[0]);
                const ib = originalOrder.indexOf(b[0]);
                // Если ключ есть в оригинале — сортируем по позиции, иначе в конец
                if (ia === -1 && ib === -1) return a[1].localeCompare(b[1], 'ru');
                if (ia === -1) return 1;
                if (ib === -1) return -1;
                return ia - ib;
            })
        );
    }

    // Обновляем UI если соответствующие функции существуют
    if (typeof renderHistory === 'function') renderHistory();
    if (typeof renderAccises === 'function') renderAccises();
    if (typeof renderRooms === 'function') renderRooms();
    if (typeof renderGihRecords === 'function') renderGihRecords();
    if (typeof updateGIHSummary === 'function') updateGIHSummary();
    if (typeof updateGIHRoomsSummary === 'function') updateGIHRoomsSummary();

    if (isRendering) return;
    isRendering = true;
    appData.gihRecords.forEach(r => normalizeRecordProducts(r));
    isRendering = false;
}

// Normalize record products (ensure they have proper structure)
function normalizeRecordProducts(record) {
    if (!record.products) record.products = [];
    if (!Array.isArray(record.products)) {
        record.products = [];
    }
    record.products = record.products.map(p => {
        if (typeof p === 'string') {
            return { name: p, count: 1 };
        }
        return p;
    });
}

// Инициализация Firebase listener при загрузке
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        loadFromFirebase().then(() => {
            setupFirebaseListener();
        }).catch(() => {
            setupFirebaseListener();
        });
    });
}


