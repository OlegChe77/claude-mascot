// Слежение за уведомлениями Windows от десктопного Claude.
// Windows пишет каждую всплывающую плашку в базу wpndatabase.db (SQLite) — новая запись
// от приложения Claude значит «Claude ждёт пользователя». Работает и с уже запущенным
// Claude, и с сессиями, в которых хук ещё не подхватился.
const path = require('path');

const DB = process.env.MASCOT_WPNDB || path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Notifications', 'wpndatabase.db');
// AUMID десктопного Claude: Claude_<издатель>!Claude (вспомогательные SshAskpass и т.п. не берём).
const SQL = `select max(n.Id) as m from Notification n join NotificationHandler h on h.RecordId = n.HandlerId
             where h.PrimaryId glob 'Claude_*!Claude' and n.Type = 'toast'`;

function watch(onToast, intervalMs = 1000) {
  let db = null, stmt = null, last = null, timer = null, retryAt = 0;

  function open() {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(DB, { readOnly: true });
    stmt = db.prepare(SQL);
  }
  function close() { try { db && db.close(); } catch {} db = stmt = null; }

  function tick() {
    try {
      if (!db) {
        if (Date.now() < retryAt) return;
        open();
      }
      const m = Number(stmt.get().m || 0);
      if (last === null) last = m;           // старые плашки при запуске не считаем
      else if (m > last) { last = m; onToast(); }
    } catch (e) {
      if (process.env.MASCOT_DEBUG) console.log('toasts:', e.message);
      close();
      retryAt = Date.now() + 10000;          // база занята/недоступна — попробуем позже
    }
  }

  tick();
  timer = setInterval(tick, intervalMs);
  return () => { clearInterval(timer); close(); };
}

// AUMID десктопного Claude из базы уведомлений (обычно один: Claude_<издатель>!Claude).
function claudeAumids() {
  let db;
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(DB, { readOnly: true });
    return db.prepare(`select PrimaryId as id from NotificationHandler where PrimaryId glob 'Claude_*!Claude'`).all().map(r => r.id);
  } catch (e) {
    if (process.env.MASCOT_DEBUG) console.log('toasts aumid:', e.message);
    return [];
  } finally { try { db && db.close(); } catch {} }
}

module.exports = { watch, claudeAumids };
