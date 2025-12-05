const express = require('express');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ID вашей беседы (проверьте по логам message_new)
const PEER_ID = 2000000001;

// Данные для Callback API VK
const CALLBACK_SECRET = process.env.VK_CALLBACK_SECRET || '';
const CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE || '';

// Инициализация Firebase Admin SDK
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('FIREBASE_SERVICE_ACCOUNT is not set');
  process.exit(1);
}

if (!process.env.FIREBASE_DATABASE_URL) {
  console.error('FIREBASE_DATABASE_URL is not set');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Ветка, куда бот пишет свои данные, чтобы не трогать существующие структуры
const VK_ROOMS_ROOT = 'vkRoomsByDate';

// Екатеринбург: UTC+5 → 5 * 60 минут
const TZ_OFFSET_MINUTES = 5 * 60;

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

app.use(express.json());

// ===== утилиты дат/времени (UTC+5, Екатеринбург) =====

function localDateFromUnix(tsSec) {
  const offsetMs = TZ_OFFSET_MINUTES * 60 * 1000;
  return new Date(tsSec * 1000 + offsetMs);
}

// ключ даты YYYY-MM-DD по времени Екатеринбурга
function dateKeyFromUnix(tsSec) {
  const d = localDateFromUnix(tsSec);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// "Сегодня" по Екатеринбургу
function todayKey() {
  const offsetMs = TZ_OFFSET_MINUTES * 60 * 1000;
  const d = new Date(Date.now() + offsetMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// формат времени HH:MM по Екатеринбургу
function timeStringFromUnix(tsSec) {
  const d = localDateFromUnix(tsSec);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ===== обработка нового сообщения =====

async function handleNewMessage(msg) {
  if (!msg) return;

  console.log('New message:', msg.peer_id, msg.text);

  if (msg.peer_id !== PEER_ID) return; // только нужная беседа

  const text = msg.text || '';
  const matches = text.match(/\d{3,4}/g);
  if (!matches) return;

  const valid = matches.filter(num => ALLOWED_SET.has(num));
  if (valid.length === 0) return;

  const msgTs = msg.date || Math.floor(Date.now() / 1000);
  const key = dateKeyFromUnix(msgTs);

  // Пишем под vkRoomsByDate/<date>/<room> = { ts: <unix> }
  const updates = {};
  for (const room of valid) {
    updates[`${VK_ROOMS_ROOT}/${key}/${room}`] = { ts: msgTs };
  }

  try {
    await db.ref().update(updates);
  } catch (e) {
    console.error('Firebase update error:', e.message);
  }
}

// ===== маршруты =====

// health-check
app.get('/', (req, res) => {
  res.send('OK');
});

// Callback API VK
app.post('/vk-callback', async (req, res) => {
  const body = req.body;

  if (CALLBACK_SECRET && body.secret && body.secret !== CALLBACK_SECRET) {
    return res.status(403).send('secret mismatch');
  }

  if (body.type === 'confirmation') {
    return res.send(CONFIRMATION_CODE);
  }

  if (body.type === 'message_new') {
    const msg = body.object && (body.object.message || body.object);
    try {
      await handleNewMessage(msg);
    } catch (e) {
      console.error('handleNewMessage failed:', e);
    }
    return res.send('ok');
  }

  return res.send('ok');
});

// Номера за сегодня с временем
app.get('/today-rooms', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = todayKey();
  try {
    const snapshot = await db.ref(`${VK_ROOMS_ROOT}/${key}`).once('value');
    const data = snapshot.val() || {};

    // data: { "1425": {ts: 1764936731}, "1502": {ts: ...}, ... }
    const rooms = Object.entries(data)
      .filter(([room, obj]) => obj && typeof obj.ts === 'number')
      .map(([room, obj]) => ({
        room,
        time: timeStringFromUnix(obj.ts)
      }))
      .sort((a, b) => Number(a.room) - Number(b.room));

    res.json({ rooms });
  } catch (e) {
    console.error('Firebase read error:', e.message);
    res.status(500).json({
      error: 'DB_ERROR',
      message: e.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
