const express = require('express');
const fetch = require('node-fetch');

// Токен читаем из переменной окружения VK_TOKEN
const VK_TOKEN = process.env.VK_TOKEN;

// peer_id беседы (можно вынести тоже в env, если нужно)
const PEER_ID = process.env.VK_PEER_ID
    ? Number(process.env.VK_PEER_ID)
    : 2000000244;

const API_VERSION = '5.131';
const PORT = process.env.PORT || 3000;

// --- Список разрешённых номеров ---
const ALLOWED_ROOMS = [
    '500', '502', '504', '506', '508', '509', '510', '512', '514', '516', '518', '520', '522', '524', '526', '528',
    '530', '532', '534', '600', '602', '604', '606', '608', '609', '610', '612', '614', '616', '618', '620', '622',
    '624', '626', '628', '630', '632', '634', '700', '702', '704', '706', '708', '709', '710', '712', '714', '716',
    '717', '718', '720', '722', '724', '725', '726', '728', '730', '732', '734', '800', '802', '804', '806', '808',
    '809', '810', '812', '814', '816', '817', '818', '820', '822', '824', '825', '826', '828', '830', '832', '834',
    '900', '902', '904', '906', '908', '909', '910', '912', '914', '916', '917', '918', '920', '922', '924', '925',
    '926', '928', '930', '932', '934', '1000', '1002', '1004', '1006', '1008', '1009', '1010', '1012', '1014', '1016',
    '1017', '1018', '1020', '1022', '1024', '1025', '1026', '1028', '1030', '1032', '1034', '1100', '1102', '1104',
    '1106', '1108', '1109', '1110', '1112', '1114', '1116', '1117', '1118', '1120', '1122', '1124', '1125', '1126',
    '1128', '1130', '1132', '1134', '1200', '1202', '1204', '1206', '1208', '1209', '1210', '1212', '1214', '1216',
    '1217', '1218', '1220', '1222', '1224', '1225', '1226', '1228', '1230', '1232', '1234', '1300', '1302', '1304',
    '1306', '1308', '1309', '1310', '1312', '1314', '1316', '1317', '1318', '1320', '1322', '1324', '1325', '1326',
    '1328', '1330', '1332', '1334', '1400', '1402', '1404', '1406', '1408', '1409', '1410', '1412', '1414', '1416',
    '1417', '1418', '1420', '1422', '1424', '1425', '1426', '1428', '1430', '1432', '1434', '1500', '1502', '1504',
    '1506', '1508', '1509', '1510', '1512', '1514', '1516', '1517', '1518', '1520', '1522', '1524', '1525', '1526',
    '1528', '1530', '1532', '1534', '1600', '1602', '1604', '1606', '1608', '1609', '1610', '1612', '1614', '1616',
    '1617', '1618', '1620', '1622', '1624', '1625', '1626', '1628', '1630', '1632', '1634', '1700', '1702', '1704',
    '1706', '1708', '1709', '1710', '1712', '1714', '1716', '1717', '1718', '1720', '1722', '1724', '1725', '1726',
    '1728', '1730', '1732', '1734', '1800', '1802', '1804', '1806', '1807', '1808', '1810', '1811', '1812', '1814',
    '1816', '1818', '1902', '1904', '1906', '1908', '1910', '1911', '1912', '1914', '1916', '1918', '1919', '1920'
];

const ALLOWED_SET = new Set(ALLOWED_ROOMS);

if (!VK_TOKEN) {
    console.warn('ВНИМАНИЕ: VK_TOKEN не задан. Перед запуском в проде обязательно задайте переменную окружения VK_TOKEN.');
}

const app = express();

// Простой health-check
app.get('/', (req, res) => {
    res.send('OK');
});

// Основной эндпоинт: GET /today-rooms
app.get('/today-rooms', async (req, res) => {
    // Разрешаем запросы с любого домена (для GitHub Pages)
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!VK_TOKEN) {
        return res.status(500).json({
            error: 'VK_TOKEN_NOT_SET',
            message: 'Переменная окружения VK_TOKEN не задана на сервере.'
        });
    }

    try {
        // "Сегодня" — по времени сервера.
        // Если нужно строго по Москве, можно доработать логику.
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startTs = Math.floor(startOfDay.getTime() / 1000);

        const found = new Set();

        let offset = 0;
        const batchSize = 200;
        let more = true;
        let totalCount = null;
        let iterations = 0;
        const maxIterations = 20; // до ~4000 сообщений за один запрос с фронта

        while (more && iterations < maxIterations) {
            const params = new URLSearchParams({
                peer_id: String(PEER_ID),
                count: String(batchSize),
                offset: String(offset),
                rev: '0',               // 0 — от новых к старым
                access_token: VK_TOKEN,
                v: API_VERSION
            });

            const response = await fetch(
                'https://api.vk.com/method/messages.getHistory?' + params.toString()
            );
            const data = await response.json();

            if (data.error) {
                console.error('VK API error:', data.error);
                return res.status(502).json({
                    error: 'VK_API_ERROR',
                    message: data.error.error_msg,
                    vk_error: data.error
                });
            }

            const vkResp = data.response;
            const items = vkResp.items || [];
            if (totalCount === null) totalCount = vkResp.count || 0;

            if (items.length === 0) break;

            for (const msg of items) {
                // Если дошли до сообщений "до начала сегодняшнего дня" — выходим
                if (msg.date < startTs) {
                    more = false;
                    break;
                }

                const text = msg.text || '';
                const matches = text.match(/\d{3,4}/g);
                if (!matches) continue;

                for (const num of matches) {
                    if (ALLOWED_SET.has(num)) {
                        found.add(num);
                    }
                }
            }

            offset += items.length;
            if (offset >= totalCount) break;
            iterations++;
        }

        const rooms = Array.from(found).sort((a, b) => Number(a) - Number(b));
        return res.json({ rooms });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            error: 'SERVER_ERROR',
            message: e.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
