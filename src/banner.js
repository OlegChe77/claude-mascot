// «Заменять плашку Claude маскотом»: выключает у десктопного Claude баннеры уведомлений Windows
// (ShowBanner=0 в HKCU\...\Notifications\Settings\<AUMID>). Сами уведомления и центр уведомлений
// остаются — запись в wpndatabase.db появляется как обычно, по ней toasts.js и зовёт маскота.
// Прежнее значение (или его отсутствие) хранится в cfg.bannerPrev и возвращается restore().
const { execFileSync } = require('child_process');
const { claudeAumids } = require('./toasts');

const ROOT = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings';
const KEY = process.env.MASCOT_REGKEY || ROOT; // для тестов — своя ветка
const reg = args => execFileSync('reg.exe', args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });

// Текущее значение ShowBanner: число или null, если не задано (Windows считает это «вкл»).
function get(aumid) {
  try {
    const m = reg(['query', `${KEY}\\${aumid}`, '/v', 'ShowBanner']).match(/ShowBanner\s+REG_DWORD\s+0x([0-9a-f]+)/i);
    return m ? parseInt(m[1], 16) : null;
  } catch { return null; }
}
function set(aumid, v) {
  if (v === null) { try { reg(['delete', `${KEY}\\${aumid}`, '/v', 'ShowBanner', '/f']); } catch {} }
  else reg(['add', `${KEY}\\${aumid}`, '/v', 'ShowBanner', '/t', 'REG_DWORD', '/d', String(v), '/f']);
}

// AUMID Claude: из базы уведомлений + уже существующие ключи в реестре.
function aumids() {
  const s = new Set(claudeAumids());
  try {
    for (const line of reg(['query', KEY]).split(/\r?\n/)) {
      const m = line.trim().match(/\\(Claude_[^\\]+!Claude)$/);
      if (m) s.add(m[1]);
    }
  } catch {}
  return [...s];
}

// Выключить баннеры. prev — cfg.bannerPrev ({aumid: значение|null}); возвращает true, если prev изменился.
function disable(prev) {
  let changed = false;
  for (const id of aumids()) {
    if (!(id in prev)) { prev[id] = get(id); changed = true; }
    try { if (get(id) !== 0) set(id, 0); } catch (e) { console.error('banner:', e.message); }
  }
  return changed;
}

// Вернуть сохранённые значения. Возвращает true, если что-то было восстановлено.
function restore(prev) {
  const ids = Object.keys(prev);
  for (const id of ids) {
    try { set(id, prev[id]); delete prev[id]; } catch (e) { console.error('banner restore:', e.message); }
  }
  return ids.length > 0;
}

module.exports = { disable, restore, get, aumids };
