const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// ID беседы
const PEER_ID = 2000000001;

// Данные для Callback API (задать в переменных окружения)
const CALLBACK_SECRET = process.env.VK_CALLBACK_SECRET || '';      // секрет из настроек VK Callback
const CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE || ''; // код подтверждения из настроек VK Callback

// Список разрешённых номеров
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

// Хранилище номеров по датам: 'YYYY-MM-DD' -> Set('500','502',...)
const roomsByDate = new Map();

// Подписчики SSE
const sseClients = new Set();

app.use(express.json());

// health-check
app.get('/', (req, res) => {
  res.send('OK');
});

// --------- утилиты дат ---------
function dateKeyFromUnix(tsSec) {
  const d = new Date(tsSec * 1000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// --------- отправка по SSE всем подключённым ---------
function broadcastRooms(payload) {
  const data = 'data: ' + JSON.stringify(payload) + '\n\n';
  for (const res of sseClients) {
    res.write(data);
  }
}

// --------- обработка нового сообщения от VK ---------
function handleNewMessage(msg) {
  if (!msg || msg.peer_id !== PEER_ID) return; // только наша беседа

  const text = msg.text || '';
  const matches = text.match(/\d{3,4}/g);
  if (!matches) return;

  const valid = matches.filter(num => ALLOWED_SET.has(num));
  if (valid.length === 0) return;

  const key = dateKeyFromUnix(msg.date || Math.floor(Date.now() / 1000));

  let set = roomsByDate.get(key);
  if (!set) {
    set = new Set();
    roomsByDate.set(key, set);
  }

  const newRooms = [];
  for (const r of valid) {
    if (!set.has(r)) {
      set.add(r);
      newRooms.push(r);
    }
  }

  // если появились новые (неповторяющиеся) номера — рассылаем на сайт
  if (newRooms.length > 0) {
    broadcastRooms({ date: key, rooms: newRooms });
  }
}

// --------- Callback API от VK ---------
app.post('/vk-callback', (req, res) => {
  const body = req.body;

  // Проверка секрета
  if (CALLBACK_SECRET && body.secret && body.secret !== CALLBACK_SECRET) {
    return res.status(403).send('secret mismatch');
  }

  if (body.type === 'confirmation') {
    // VK ждёт от нас строку подтверждения
    return res.send(CONFIRMATION_CODE);
  }

  if (body.type === 'message_new') {
    const msg = body.object && (body.object.message || body.object);
    handleNewMessage(msg);
    return res.send('ok');
  }

  // прочие события тоже подтверждаем
  return res.send('ok');
});

// --------- SSE‑поток для фронтенда ---------
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Можно настроить повторное подключение клиента
  res.write('retry: 10000\n\n');

  sseClients.add(res);

  req.on('close', () => {
    sseClients.delete(res);
  });
});

// --------- Номера за сегодня (по запросу) ---------
app.get('/today-rooms', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = todayKey();
  const set = roomsByDate.get(key);
  const rooms = set ? Array.from(set).sort((a, b) => Number(a) - Number(b)) : [];
  res.json({ rooms });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
