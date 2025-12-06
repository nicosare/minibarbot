const express = require('express');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// === VK настройки ===
const VK_BOT_TOKEN = process.env.VK_BOT_TOKEN;
const VK_GROUP_ID = Number(process.env.VK_GROUP_ID || '234416204');
// peer_id вашей беседы
const PEER_ID = 2000000001;

if (!VK_BOT_TOKEN) {
  console.error('VK_BOT_TOKEN не задан. Укажите токен бота в переменной окружения.');
  process.exit(1);
}

// === Firebase ===
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error('FIREBASE_SERVICE_ACCOUNT не задан.');
  process.exit(1);
}
if (!process.env.FIREBASE_DATABASE_URL) {
  console.error('FIREBASE_DATABASE_URL не задан.');
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Ветка, куда пишем, чтобы не трогать ваши данные
// vkRoomsByDate/<YYYY-MM-DD>/<conversation_message_id>:
//   { ts: <unix>, rooms: { "<room>": true, ... } }
const VK_ROOMS_ROOT = 'vkRoomsByDate';

// Екатеринбург: UTC+5 → 5 * 60 минут
const TZ_OFFSET_MINUTES = 5 * 60;

// Список допустимых номеров
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

// === утилиты времени (UTC+5, Екатеринбург) ===
function localDateFromUnix(tsSec) {
  const offsetMs = TZ_OFFSET_MINUTES * 60 * 1000;
  return new Date(tsSec * 1000 + offsetMs);
}

function dateKeyFromUnix(tsSec) {
  const d = localDateFromUnix(tsSec);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() {
  const offsetMs = TZ_OFFSET_MINUTES * 60 * 1000;
  const d = new Date(Date.now() + offsetMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeStringFromUnix(tsSec) {
  const d = localDateFromUnix(tsSec);
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// === обработка (нового или отредактированного) сообщения ===
async function upsertMessageRooms(msg) {
  if (!msg) return;

  console.log('Message:', msg.peer_id, msg.conversation_message_id, msg.text);

  if (msg.peer_id !== PEER_ID) return;

  const text = msg.text || '';
  const matches = text.match(/\d{3,4}/g) || [];
  const valid = matches.filter(num => ALLOWED_SET.has(num));

  const msgTs = msg.date || Math.floor(Date.now() / 1000);
  const key = dateKeyFromUnix(msgTs);

  const convId = msg.conversation_message_id || msg.id;
  if (!convId) return;

  const ref = db.ref(`${VK_ROOMS_ROOT}/${key}/${convId}`);

  if (valid.length === 0) {
    // В сообщении больше нет номеров → удаляем запись
    await ref.remove();
    return;
  }

  const roomsObj = {};
  for (const room of valid) {
    roomsObj[room] = true;
  }

  // Полностью перезаписываем номера для этого сообщения
  await ref.set({
    ts: msgTs,
    rooms: roomsObj
  });
}

// === Bots Long Poll API ===

async function getLongPollServer() {
  const params = new URLSearchParams({
    group_id: VK_GROUP_ID.toString(),
    access_token: VK_BOT_TOKEN,
    v: '5.199'
  });

  const res = await fetch(
    'https://api.vk.com/method/groups.getLongPollServer?' + params.toString()
  );
  const data = await res.json();

  if (data.error) {
    throw new Error('VK groups.getLongPollServer error: ' + data.error.error_msg);
  }

  return data.response; // { server, key, ts }
}

async function startLongPoll() {
  console.log('Starting VK Long Poll...');

  while (true) {
    try {
      const { server, key, ts } = await getLongPollServer();
      console.log('Long Poll server obtained');

      let tsCur = ts;

      while (true) {
        const baseUrl = server.startsWith('http') ? server : 'https://' + server;

const lpURL =
  baseUrl +
  '?' +
  new URLSearchParams({
    act: 'a_check',
    key,
    ts: String(tsCur),
    wait: '25',
    mode: '2',
    version: '3'
  }).toString();

        const res = await fetch(lpURL);
        const data = await res.json();

        if (data.failed) {
          // см. доку VK Bots Long Poll API
          if (data.failed === 1 && data.ts) {
            tsCur = data.ts;
            continue;
          }
          // 2 или 3 → нужно заново получить ключ/сервер
          console.warn('Long Poll failed, need new server/key:', data);
          break;
        }

        tsCur = data.ts;
        
// ЛОГИРУЕМ ВСЕ ОБНОВЛЕНИЯ ДЛЯ ОТЛАДКИ
const updates = data.updates || [];

for (const upd of updates) {
  // Логируем абсолютно все апдейты как есть
  console.log('VK update RAW:', JSON.stringify(upd));

  // Дополнительно выведем только тип и peer_id, если есть
  if (upd.object && (upd.object.message || upd.object)) {
    const m = upd.object.message || upd.object;
    console.log('VK update TYPE:', upd.type, 'PEER_ID:', m.peer_id, 'TEXT:', m.text);
  }

  if (upd.type === 'message_new' || upd.type === 'message_edit') {
    const msg = upd.object && (upd.object.message || upd.object);
    try {
      await upsertMessageRooms(msg);
    } catch (e) {
      console.error('upsertMessageRooms error:', e);
    }
  }
}
      }

      // Цикл по серверу вышел → запрашиваем новый сервер
      console.log('Restarting Long Poll server...');
    } catch (e) {
      console.error('Long Poll error:', e.message);
      // подождём и попробуем снова
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// === HTTP маршруты ===

// health-check
app.get('/', (req, res) => {
  res.send('OK');
});

// Номера за сегодня с временем
app.get('/today-rooms', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = todayKey();

  try {
    const snapshot = await db.ref(`${VK_ROOMS_ROOT}/${key}`).once('value');
    const dayData = snapshot.val() || {};
    // dayData:
    //  "<convId>": { ts: <unix>, rooms: { "<room>": true, ... } }

    const roomToTs = new Map();

    for (const entry of Object.values(dayData)) {
      if (!entry || !entry.rooms) continue;
      const ts = typeof entry.ts === 'number' ? entry.ts : 0;
      for (const room of Object.keys(entry.rooms)) {
        const prev = roomToTs.get(room);
        if (prev == null || ts < prev) {
          roomToTs.set(room, ts);
        }
      }
    }

    const rooms = Array.from(roomToTs.entries())
      .map(([room, ts]) => ({
        room,
        time: timeStringFromUnix(ts)
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

// стартуем HTTP и Long Poll
app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
  startLongPoll().catch(err => {
    console.error('Failed to start Long Poll:', err);
  });
});
