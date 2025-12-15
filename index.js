function isValidCommand(text) {
  if (!text || typeof text !== 'string') return false;

  // Убираем знаки препинания и пробелы для анализа
  const normalized = text.trim();
  const lowerText = normalized.toLowerCase();
  if (normalized.length === 0) return false;

  // Находим все номера в тексте
  const roomMatches = [];
  const matchesIter = normalized.matchAll(/\d{3,4}/g);
  for (const m of matchesIter) {
    const num = m[0];
    if (!ALLOWED_SET.has(num)) continue;
    const start = m.index != null ? m.index : normalized.indexOf(num);
    const end = start + num.length;
    roomMatches.push({ num, start, end });
  }

  if (roomMatches.length === 0) return false;

  // Проверяем паттерн 1: только "-", номера и разделители (пробелы, запятые)
  // Примеры: "-510", "-510 -512", "- 510", "-504, -510, -512"
  const minusPattern = /^[\s\-,]*(\d{3,4}[\s\-,]*)+$/;
  if (minusPattern.test(normalized)) {
    // Проверяем, что все найденные номера действительно с "-"
    let allHaveMinus = true;
    for (const { num, start } of roomMatches) {
      let hasMinus = false;
      for (let i = start - 1; i >= 0; i--) {
        const ch = normalized[i];
        if (ch === ' ' || ch === '\t' || ch === ',') continue;
        if (ch === '-') {
          hasMinus = true;
          break;
        }
        break;
      }
      if (!hasMinus) {
        allHaveMinus = false;
        break;
      }
    }
    if (allHaveMinus) return true;
  }

  // Проверяем паттерн 2: только номер/номера (без "-" перед номерами и без "опустош")
  // Примеры: "510", "510 512", "510-512" (дефис между номерами допустим)
  // Проверяем, что нет "-" непосредственно перед номерами (это было бы паттерн 1)
  let hasMinusBeforeAnyRoom = false;
  for (const { start } of roomMatches) {
    // Проверяем символы перед номером
    for (let i = start - 1; i >= 0; i--) {
      const ch = normalized[i];
      if (ch === ' ' || ch === '\t' || ch === ',') continue;
      if (ch === '-') {
        // Найден "-" перед номером - это паттерн удаления, не паттерн 2
        hasMinusBeforeAnyRoom = true;
        break;
      }
      // Если встретили другой символ (не пробел и не "-"), это не "-" перед номером
      break;
    }
    if (hasMinusBeforeAnyRoom) break;
  }
  
  if (!hasMinusBeforeAnyRoom) {
    // Проверяем, что в тексте нет "опустош" (это было бы паттерн 3)
    if (lowerText.indexOf('опустош') === -1) {
      // Проверяем, что это действительно только номера и знаки препинания
      const textWithoutRooms = normalized.replace(/\d{3,4}/g, '').replace(/[\s,\.;:!?\-]/g, '');
      if (textWithoutRooms.length === 0) return true;
    }
  }

  // Проверяем паттерн 3: номер/номера и "опустош" (опустош может быть частью слова)
  // Примеры: "510 опустошил", "510 опустош", "510 опустошить"
  // НЕ валидно: "510 опустошить надо", "510 опустош и ещё что-то"
  const опустошIndex = lowerText.indexOf('опустош');
  
  if (опустошIndex !== -1) {
    // Проверяем, что "опустош" идёт после номеров
    const lastRoomEnd = Math.max(...roomMatches.map(r => r.end));
    if (опустошIndex < lastRoomEnd) return false;

    // Проверяем, что перед "опустош" нет посторонних слов (только номера и знаки препинания)
    const beforeОпустош = normalized.slice(0, опустошIndex);
    const beforeCleaned = beforeОпустош.replace(/\d{3,4}/g, '').replace(/[\s,\.;:!?\-]/g, '');
    if (beforeCleaned.length > 0) return false;

    // Проверяем, что после "опустош" нет других слов
    const afterОпустош = normalized.slice(опустошIndex + 'опустош'.length);
    
    // Если после "опустош" сразу идут буквы (без пробела) - это часть слова, например "опустошил"
    // Проверяем, что после этого слова нет других слов
    if (afterОпустош.length > 0) {
      // Находим конец слова, содержащего "опустош" (до пробела или знака препинания)
      const wordMatch = afterОпустош.match(/^[а-яёa-z]*/i);
      if (wordMatch) {
        // Есть продолжение слова после "опустош"
        const wordEnd = wordMatch[0].length;
        const afterWord = afterОпустош.slice(wordEnd);
        // После слова должны быть только пробелы и знаки препинания
        const afterWordCleaned = afterWord.replace(/[\s,\.;:!?\-]/g, '');
        if (afterWordCleaned.length > 0) return false; // Есть другие слова после
      } else {
        // После "опустош" сразу пробел или знак препинания
        // Проверяем, что дальше нет букв (других слов)
        const afterCleaned = afterОпустош.replace(/[\s,\.;:!?\-]/g, '');
        if (afterCleaned.length > 0) return false; // Есть другие слова
      }
    }

    return true;
  }

  return false;
}
