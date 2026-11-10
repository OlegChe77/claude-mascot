// Установка/удаление хуков Claude Code в ~/.claude/settings.json (с бэкапом).
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = +process.env.MASCOT_PORT || 47821; // MASCOT_PORT — только для тестов (вместе с MASCOT_SETTINGS)
const MARK = `127.0.0.1:${PORT}/hook`;
// Работает и в bash (Git Bash), и в cmd; при выключенной программе молча завершается с кодом 0.
const COMMAND = `curl -s -m 2 --data-binary @- http://${MARK} || exit 0`;
// Событие → доп. поля группы. Десктопный Claude спрашивает разрешения и задаёт вопросы
// без события Notification, поэтому ловим ещё PermissionRequest и сами инструменты-вопросы.
const HOOKS = {
  Notification: {},
  PermissionRequest: {},
  PreToolUse: { matcher: 'AskUserQuestion|ExitPlanMode' },
  Stop: {},
};
const EVENTS = Object.keys(HOOKS);
const BASE = ['Notification', 'PermissionRequest', 'PreToolUse']; // всё, кроме Stop

function settingsPath() {
  return process.env.MASCOT_SETTINGS || path.join(os.homedir(), '.claude', 'settings.json');
}

const isOurs = h => h && typeof h.command === 'string' && h.command.includes(MARK);

function load() {
  const p = settingsPath();
  if (!fs.existsSync(p)) return { p, raw: null, data: {} };
  const raw = fs.readFileSync(p, 'utf8');
  const text = raw.replace(/^﻿/, '');
  const data = text.trim() ? JSON.parse(text) : {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('settings.json: expected an object');
  return { p, raw, data };
}

// Какие из наших хуков сейчас прописаны.
function status() {
  try {
    const { data } = load();
    const res = {};
    for (const ev of EVENTS) {
      const groups = data.hooks && Array.isArray(data.hooks[ev]) ? data.hooks[ev] : [];
      res[ev] = groups.some(g => Array.isArray(g && g.hooks) && g.hooks.some(isOurs));
    }
    return res;
  } catch {
    return Object.fromEntries(EVENTS.map(ev => [ev, false]));
  }
}

function backup(p, raw) {
  const d = new Date(), z = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`;
  fs.writeFileSync(`${p}.mascot-${stamp}.bak`, raw);
  // Храним только 5 последних бэкапов программы.
  const dir = path.dirname(p), base = path.basename(p) + '.mascot-';
  const old = fs.readdirSync(dir).filter(f => f.startsWith(base) && f.endsWith('.bak')).sort();
  for (const f of old.slice(0, Math.max(0, old.length - 5))) {
    try { fs.unlinkSync(path.join(dir, f)); } catch {}
  }
}

// want: список событий, на которых должен стоять наш хук (пустой — убрать всё).
// Возвращает 'changed' | 'unchanged'; при ошибке бросает исключение, файл не трогает.
function apply(want) {
  const { p, raw, data } = load();
  const before = JSON.stringify(data);
  const hooks = data.hooks && typeof data.hooks === 'object' && !Array.isArray(data.hooks) ? data.hooks : {};

  for (const ev of EVENTS) {
    let groups = Array.isArray(hooks[ev]) ? hooks[ev] : [];
    groups = groups.flatMap(g => {
      if (!g || !Array.isArray(g.hooks) || !g.hooks.some(isOurs)) return [g];
      const rest = g.hooks.filter(h => !isOurs(h));
      return rest.length ? [{ ...g, hooks: rest }] : [];
    });
    if (want.includes(ev)) groups.push({ ...HOOKS[ev], hooks: [{ type: 'command', command: COMMAND, timeout: 5 }] });
    if (groups.length) hooks[ev] = groups; else delete hooks[ev];
  }
  if (Object.keys(hooks).length) data.hooks = hooks; else delete data.hooks;

  if (raw !== null && JSON.stringify(data) === before) return 'unchanged';
  if (raw === null && !want.length) return 'unchanged';

  fs.mkdirSync(path.dirname(p), { recursive: true });
  if (raw !== null) backup(p, raw);
  const tmp = `${p}.mascot-tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(tmp, p);
  return 'changed';
}

module.exports = { PORT, COMMAND, EVENTS, BASE, settingsPath, status, apply };
