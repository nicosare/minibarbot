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

// Отдельная глобальная ветка для опустошённых номеров (без дат):
// vkEmptiedRooms/<room>: true
const VK_EMPTIED_ROOT = 'vkEmptiedRooms';

// Упрощенная структура "уже проверенных номеров" по дате:
// vkCheckedRoomsByDate/<YYYY-MM-DD>/<room>: { ts: <unix> }
const VK_CHECKED_ROOT = 'vkCheckedRoomsByDate';

// Обновление статуса сроков для номера в ветке minibarData/rooms
async function setDeadlineStatusForRoom(roomNumber, status) {
  try {
    const snap = await db.ref('minibarData/rooms').once('value');
    const rooms = snap.val();
    if (!Array.isArray(rooms)) return;

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      if (!r || typeof r !== 'object') continue;
      if (String(r.number) === String(roomNumber)) {
        await db.ref(`minibarData/rooms/${i}/deadlinesStatus`).set(status);
        break;
      }
    }
  } catch (e) {
    console.error('Failed to update deadline status for room', roomNumber, e.message);
  }
}

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
  // Ищем номера с учетом их позиции, чтобы понять,
  // стоит ли перед номером "-" (значит — удалить),
  // а также есть ли после номеров слово "опустош".
  const matchesIter = text.matchAll(/\d{3,4}/g);
  const foundRooms = [];
  let hasMinusAny = false;

  for (const m of matchesIter) {
    const num = m[0];
    if (!ALLOWED_SET.has(num)) continue;

    const start = m.index != null ? m.index : text.indexOf(num);
    const end = start + num.length;

    // Проверяем, есть ли перед номером знак "-" (можно с пробелами).
    let isMinus = false;
    for (let i = start - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === ' ' || ch === '\t') continue;
      if (ch === '-') isMinus = true;
      break;
    }

    const roomInfo = {
      room: num,
      start,
      end,
      isMinus
    };
    foundRooms.push(roomInfo);
    if (isMinus) {
      hasMinusAny = true;
    }
  }

  if (foundRooms.length === 0) {
    return;
  }

  // Проверяем, есть ли слово "опустош" после последнего номера (игнорируем регистр).
  const lastEnd = Math.max(...foundRooms.map(r => r.end));
  const suffix = text.slice(lastEnd);
  const hasEmptyMark = suffix.toLowerCase().includes('опустош');

  const msgTs = msg.date || Math.floor(Date.now() / 1000);
  const key = dateKeyFromUnix(msgTs);

  const roomsToAdd = [];
  const minusRooms = [];

  for (const { room, isMinus } of foundRooms) {
    // Глобальный список опустошённых номеров (без привязки к дате)
    const emptiedRef = db.ref(`${VK_EMPTIED_ROOT}/${room}`);

    if (isMinus) {
      // Сообщение вида "-500" → номер нужно убрать из списка проверенных
      // и из списка опустошённых.
      minusRooms.push(room);
      await emptiedRef.remove();
      continue;
    }

    if (hasEmptyMark) {
      // После номера/номеров есть слово "опустуш" → помечаем как опустошенный
      roomsToAdd.push({ room, emptied: true });

      // Запоминаем номер как опустошённый в отдельной ветке
      await emptiedRef.set(true);

      // По требованию: при "опустош" ставим deadlinesStatus = ok
      await setDeadlineStatusForRoom(room, 'ok');
    } else {
      // Проверяем, был ли номер ранее в списке опустошённых
      let wasEmptied = false;
      try {
        const snap = await emptiedRef.once('value');
        wasEmptied = snap.exists();
      } catch (e) {
        console.error('Failed to read emptied state for room', room, e.message);
      }

      // Обычный номер без спец. пометок
      roomsToAdd.push({ room, emptied: false });

      // Если номер был ранее в списке опустошённых, а теперь пришёл без подписей,
      // убираем его из списка опустошённых.
      await emptiedRef.remove();

      // Статус сроков меняем на neutral ТОЛЬКО если он действительно был опустошён ранее
      if (wasEmptied) {
        await setDeadlineStatusForRoom(room, 'neutral');
      }
    }
  }

  // Обновляем упрощённую структуру "уже проверенных номеров" на текущую дату.
  try {
    const checkedDayRef = db.ref(`${VK_CHECKED_ROOT}/${key}`);

    // Добавляем/обновляем все номера из этого сообщения без "-"
    for (const item of roomsToAdd) {
      await checkedDayRef.child(item.room).set({ ts: msgTs });
    }

    // Удаляем все номера, которые пришли с "-"
    for (const mRoom of minusRooms) {
      await checkedDayRef.child(mRoom).remove();
    }
  } catch (e) {
    console.error('Failed to update checked rooms list:', e);
  }

  // Если в сообщении был хотя бы один номер с "-", после успешного
  // "удаления из базы" ставим лайк на это сообщение.
  if (hasMinusAny) {
    try {
      await addLikeToMessage(msg.peer_id, msg.conversation_message_id || msg.id);
    } catch (e) {
      console.error('addLikeToMessage error:', e);
    }
  }
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

// Поставить "лайк" (reaction=like) на сообщение после успешного удаления номера
async function addLikeToMessage(peerId, conversationMessageId) {
  if (!peerId || !conversationMessageId) return;

  try {
    const params = new URLSearchParams({
      peer_id: String(peerId),
      conversation_message_id: String(conversationMessageId),
      reaction: 'like',
      access_token: VK_BOT_TOKEN,
      v: '5.199'
    });

    const res = await fetch('https://api.vk.com/method/messages.addReaction', {
      method: 'POST',
      body: params
    });

    const data = await res.json();

    if (data.error) {
      console.error('VK messages.addReaction error:', data.error.error_msg || data.error);
    } else {
      console.log('Reaction \"like\" added to message', peerId, conversationMessageId);
    }
  } catch (e) {
    console.error('Failed to add reaction to message:', e.message);
  }
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

// Глобальный список опустошённых номеров (без привязки к дате)
app.get('/emptied-rooms', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const snap = await db.ref(VK_EMPTIED_ROOT).once('value');
    const data = snap.val() || {};
    const rooms = Object.keys(data);
    res.json({ rooms });
  } catch (e) {
    console.error('Firebase read error (emptied-rooms):', e.message);
    res.status(500).json({
      error: 'DB_ERROR',
      message: e.message
    });
  }
});

// Номера за сегодня с временем
app.get('/today-rooms', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const key = todayKey();

  try {
    // Читаем упрощенную структуру проверенных номеров на сегодня
    const checkedSnap = await db.ref(`${VK_CHECKED_ROOT}/${key}`).once('value');
    const checkedData = checkedSnap.val() || {};

    // Для каждого номера храним объект { ts },
    // где ts — время (последнего) появления номера в списке проверенных.
    const roomToInfo = new Map();
    for (const [room, entry] of Object.entries(checkedData)) {
      if (!entry) continue;
      const ts = typeof entry.ts === 'number' ? entry.ts : 0;
      roomToInfo.set(room, { ts });
    }

    // Читаем глобальный список опустошённых номеров
    let emptiedGlobal = {};
    try {
      const emptiedSnap = await db.ref(VK_EMPTIED_ROOT).once('value');
      emptiedGlobal = emptiedSnap.val() || {};
    } catch (e) {
      console.error('Firebase read error (emptied list):', e.message);
    }

    const rooms = Array.from(roomToInfo.entries())
      .map(([room, info]) => {
        const globallyEmptied =
          emptiedGlobal && Object.prototype.hasOwnProperty.call(emptiedGlobal, room);
        return {
          room,
          time: timeStringFromUnix(info.ts),
          // Источником правды для опустошения является только глобальный список.
          emptied: !!globallyEmptied
        };
      })
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
