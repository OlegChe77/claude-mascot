const { app, BrowserWindow, Tray, Menu, screen, ipcMain, shell, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const hook = require('./hook');
const toasts = require('./toasts');
const banner = require('./banner');
const i18n = require('./i18n');
const updaterLib = require('./updater');

let w32 = null;
try { w32 = require('./win32'); } catch (e) { console.error('win32:', e); }

const DONATE = 'https://dalink.to/olegche';
const H = 190; // высота полосы над панелью задач при масштабе 100%
const SIZES = [1, 1.5, 2];
const scale = () => SIZES.includes(cfg.scale) ? cfg.scale : 1.5;
const lang = () => i18n.resolve(cfg.lang);
const t = () => i18n.T[lang()];
const ASSETS = path.join(__dirname, '..', 'assets');

app.setAppUserModelId('OlegChe77.Mascot');
if (!app.requestSingleInstanceLock()) { app.quit(); return; }

// ---------- настройки ----------
const cfgFile = () => path.join(app.getPath('userData'), 'config.json');
let cfg = { sound: true, scale: 1.5, hook: true, stopHook: false, toasts: true, autostart: false, firstRunDone: false, replaceBanner: true, bannerPrev: {}, lang: 'auto', autoUpdate: true };
// До 1.1 программа называлась «Маскот» и хранила настройки в %APPDATA%\Маскот — переносим (там и bannerPrev).
function migrateCfg() {
  try {
    const old = path.join(app.getPath('appData'), 'Маскот', 'config.json');
    if (!fs.existsSync(cfgFile()) && fs.existsSync(old)) {
      fs.mkdirSync(path.dirname(cfgFile()), { recursive: true });
      fs.copyFileSync(old, cfgFile());
    }
  } catch (e) { console.error('migrateCfg:', e); }
}
function loadCfg() { migrateCfg(); try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(cfgFile(), 'utf8')) }; } catch {} }
function saveCfg() { try { fs.mkdirSync(path.dirname(cfgFile()), { recursive: true }); fs.writeFileSync(cfgFile(), JSON.stringify(cfg, null, 2)); } catch (e) { console.error(e); } }

// ---------- состояние ----------
let win = null, tray = null, server = null;
let cycle = false;            // маскот сейчас зовёт пользователя
let claudeActive = false;     // активное окно — Claude
let lastClaude = null;        // последнее окно Claude, которое было активным
let claudeExe = '';           // путь к Claude.exe, если встречался
let hookError = '';
let pending = null;           // ожидание ответа renderer на status

const isClaude = i => !!i && (i.exe === 'claude.exe' || /claude/i.test(i.title));

// ---------- окно маскота ----------
function bounds() {
  const wa = screen.getPrimaryDisplay().workArea;
  const h = Math.round(H * scale());
  return { x: wa.x, y: wa.y + wa.height - h, width: wa.width, height: h };
}

function createWindow() {
  win = new BrowserWindow({
    ...bounds(),
    show: false, frame: false, transparent: true, backgroundColor: '#00000000', hasShadow: false,
    resizable: false, movable: false, minimizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, alwaysOnTop: true, focusable: false, title: 'Mascot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      autoplayPolicy: 'no-user-gesture-required',
      backgroundThrottling: false,
      contextIsolation: true, nodeIntegration: false, spellcheck: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, 'mascot.html'), { query: { lang: lang() } });
  // Масштаб всей страницы: анимация считает в CSS-пикселях, поэтому ничего в ней менять не нужно.
  win.webContents.on('did-finish-load', () => { win.webContents.setZoomFactor(scale()); win.webContents.send('sound', cfg.sound); });
  if (process.env.MASCOT_DEBUG) {
    win.webContents.on('console-message', e => console.log('[renderer]', e.message));
    win.webContents.on('preload-error', (_e, p, err) => console.log('[preload-error]', p, err));
  }
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
  const fit = () => { if (win && !win.isDestroyed()) win.setBounds(bounds()); };
  screen.on('display-metrics-changed', fit);
  screen.on('display-added', fit);
  screen.on('display-removed', fit);
}

function showWindow() {
  win.setBounds(bounds());
  win.setIgnoreMouseEvents(true, { forward: true });
  if (!win.isVisible()) win.showInactive();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.moveTop();
}

function notify(force) {
  if (!win) return;
  if (!force && (cycle || claudeActive)) return; // уже зовёт / пользователь и так в Claude
  cycle = true;
  showWindow();
  win.webContents.send('notify');
}

function dismiss() {
  if (!cycle || !win) return;
  cycle = false;
  win.webContents.send('leave');
}

ipcMain.on('mouse', (_e, over) => { if (process.env.MASCOT_DEBUG) console.log('mouse', over); win && win.setIgnoreMouseEvents(!over, { forward: true }); });
ipcMain.on('idle', () => {
  if (cycle || !win) return;
  win.setIgnoreMouseEvents(true, { forward: true });
  win.hide();
});
ipcMain.on('ping', (_e, on) => setTrayIcon(on));
ipcMain.on('clicked', () => { cycle = false; focusClaude(); });
ipcMain.on('status', (_e, s) => { if (pending) { pending(s); pending = null; } });

// ---------- Claude: активность и разворачивание ----------
function poll() {
  if (!w32) return;
  let fg;
  try { fg = w32.foreground(); } catch { return; }
  const now = isClaude(fg);
  if (now) {
    lastClaude = fg.hwnd;
    if (fg.exe === 'claude.exe') claudeExe = fg.path;
    if (cycle) dismiss();
  }
  claudeActive = now;
}

function focusClaude() {
  if (!w32) { shell.openExternal('claude://'); return; }
  try {
    let h = w32.alive(lastClaude) ? lastClaude : 0;
    if (!h) {
      const list = w32.windowsOf('claude.exe');
      if (list.length) h = list[0].hwnd;
    }
    if (h) { w32.activate(h); return; }
    // Окно Claude спрятано в трей — повторный запуск покажет существующее окно.
    const hidden = w32.windowsOf('claude.exe', { visibleOnly: false });
    const exe = (hidden[0] && hidden[0].path) || claudeExe;
    if (exe && fs.existsSync(exe)) spawn(exe, [], { detached: true, stdio: 'ignore' }).unref();
    else shell.openExternal('claude://');
  } catch (e) { console.error('focusClaude:', e); }
}

// ---------- приём сигналов от Claude Code ----------
const ASK_TOOLS = ['AskUserQuestion', 'ExitPlanMode'];
function startServer() {
  server = http.createServer((req, res) => {
    // Запросы из браузера (с Origin) не принимаем — только локальные утилиты вроде curl.
    if (req.headers.origin) { res.writeHead(403); res.end(); return; }
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      const url = (req.url || '').split('?')[0];
      if (url === '/status') { sendStatus(res); return; }
      res.writeHead(204); res.end(); // пустой ответ: hook ничего не выводит в Claude
      if (url === '/hook') {
        let j = {};
        try { j = JSON.parse(body || '{}'); } catch {}
        const ev = j.hook_event_name || 'Notification';
        const call = !(ev === 'Notification' && j.notification_type === 'auth_success')
          && !(ev === 'PreToolUse' && !ASK_TOOLS.includes(j.tool_name))
          && ['Notification', 'PermissionRequest', 'PreToolUse', 'Stop'].includes(ev);
        if (process.env.MASCOT_DEBUG) console.log('hook', ev, j.tool_name || j.notification_type || '', call ? 'call' : 'skip', claudeActive ? '(claude active)' : '');
        if (call) notify(false);
      } else if (url === '/notify') notify(false);
      else if (url === '/test') notify(true);
      else if (url === '/dismiss') dismiss();
      else if (process.env.MASCOT_DEBUG && url === '/quit') app.quit();             // для тестов: как «Выход»
      else if (process.env.MASCOT_DEBUG && url === '/replace-banner') {              // для тестов: как пункт трея
        cfg.replaceBanner = /on=1/.test(req.url); saveCfg(); syncBanner(); buildMenu();
      }
      else if (process.env.MASCOT_DEBUG && url === '/lang') setLang((/l=(\w+)/.exec(req.url) || [])[1] || 'auto'); // для тестов: пункт «Язык»
    });
  });
  server.on('error', e => {
    dialog.showErrorBox(t().name, e.code === 'EADDRINUSE' ? t().portBusy(hook.PORT) : t().portErr(hook.PORT, e.message));
  });
  server.listen(hook.PORT, '127.0.0.1');
}

function sendStatus(res) {
  const reply = r => { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(r)); };
  const base = { cycle, claudeActive, windowVisible: !!win && win.isVisible(), bounds: win && win.getBounds(), cfg, hooks: hook.status(), hookError,
    banner: Object.fromEntries(banner.aumids().map(id => [id, banner.get(id)])) };
  if (!win) return reply(base);
  const t = setTimeout(() => { pending = null; reply(base); }, 500);
  pending = s => { clearTimeout(t); reply({ ...base, renderer: s }); };
  win.webContents.send('status');
}

// ---------- хук ----------
function syncHook() {
  const want = cfg.hook ? (cfg.stopHook ? [...hook.BASE, 'Stop'] : hook.BASE) : [];
  try { hook.apply(want); hookError = ''; return true; }
  catch (e) { hookError = e.message; return false; }
}

// ---------- автозапуск ----------
function exePath() { return process.env.PORTABLE_EXECUTABLE_FILE || process.execPath; }
function loginArgs() { return app.isPackaged ? [] : [app.getAppPath()]; }
function setAutostart(on) {
  app.setLoginItemSettings({ openAtLogin: on, path: exePath(), args: loginArgs() });
}

// ---------- плашки Claude ----------
// Включено «Заменять плашку» — баннеры Claude выключены (уведомления в центре остаются), иначе — прежнее значение.
function syncBanner() {
  if (!cfg.bannerPrev || typeof cfg.bannerPrev !== 'object') cfg.bannerPrev = {};
  const changed = cfg.replaceBanner ? banner.disable(cfg.bannerPrev) : banner.restore(cfg.bannerPrev);
  if (changed) saveCfg();
}
function restoreBanner() { if (banner.restore(cfg.bannerPrev || {})) saveCfg(); }

// ---------- трей ----------
let icons = {};
function setTrayIcon(ping) { if (tray) tray.setImage(ping ? icons.ping : icons.normal); }

function setLang(l) {
  cfg.lang = l; saveCfg();
  win.webContents.send('lang', lang());
  tray.setToolTip(`${t().tooltip} (v${app.getVersion()})`);
  buildMenu();
}

function updateItems() {
  if (!updater || !updater.supported()) return [];
  const T = t(), s = updater.get();
  const main =
    s.state === 'ready' ? { label: T.upReady(s.latest), click: () => updater.install() } :
    s.state === 'available' ? { label: T.upAvailable(s.latest), click: () => updater.install() } :
    s.state === 'downloading' ? { label: T.upDownloading(s.latest), enabled: false } :
    s.state === 'checking' ? { label: T.upChecking, enabled: false } :
    { label: T.upCheck, click: () => checkUpdates(true) };
  return [main, { label: T.upAuto, type: 'checkbox', checked: cfg.autoUpdate, click: m => { cfg.autoUpdate = m.checked; saveCfg(); } }, { type: 'separator' }];
}

function buildMenu() {
  const hs = hook.status();
  const T = t();
  const settingsErr = () => dialog.showErrorBox(T.name, T.settingsErr(hook.settingsPath(), hookError));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: T.test, click: () => notify(true) },
    { type: 'separator' },
    { label: T.size, submenu: SIZES.map((v, i) => ({ label: T.sizes[i], type: 'radio', checked: scale() === v, click: () => {
      cfg.scale = v; saveCfg(); win.setBounds(bounds()); win.webContents.setZoomFactor(v); notify(true);
    } })) },
    { label: T.language, submenu: [['auto', T.langAuto], ...i18n.LANGS].map(([v, name]) => ({ label: name, type: 'radio', checked: (cfg.lang || 'auto') === v, click: () => setLang(v) })) },
    { label: T.sound, type: 'checkbox', checked: cfg.sound, click: m => { cfg.sound = m.checked; saveCfg(); win.webContents.send('sound', cfg.sound); } },
    { label: T.autostart, type: 'checkbox', checked: cfg.autostart, click: m => { cfg.autostart = m.checked; saveCfg(); setAutostart(cfg.autostart); } },
    { type: 'separator' },
    { label: T.replaceBanner, type: 'checkbox', checked: cfg.replaceBanner, click: m => { cfg.replaceBanner = m.checked; saveCfg(); syncBanner(); } },
    { label: T.toasts, type: 'checkbox', checked: cfg.toasts, click: m => { cfg.toasts = m.checked; saveCfg(); } },
    { label: hookError ? T.hookError : T.hook, type: 'checkbox', checked: cfg.hook && hook.BASE.every(ev => hs[ev]), click: m => {
      cfg.hook = m.checked; saveCfg();
      if (!syncHook()) settingsErr();
      buildMenu();
    } },
    { label: T.stopHook, type: 'checkbox', checked: cfg.stopHook, enabled: cfg.hook, click: m => {
      cfg.stopHook = m.checked; saveCfg();
      if (!syncHook()) settingsErr();
      buildMenu();
    } },
    { type: 'separator' },
    ...updateItems(),
    { label: T.donate, click: () => shell.openExternal(DONATE) },
    { label: T.quit, click: () => app.quit() },
  ]));
}

function createTray() {
  icons.normal = nativeImage.createFromPath(path.join(ASSETS, 'tray.ico'));
  icons.ping = nativeImage.createFromPath(path.join(ASSETS, 'tray-ping.ico'));
  tray = new Tray(icons.normal);
  tray.setToolTip(`${t().tooltip} (v${app.getVersion()})`);
  tray.on('click', () => tray.popUpContextMenu());
  buildMenu();
}

// ---------- обновления ----------
let updater = null, manualCheck = false, announced = '';
function onUpdate(s) {
  if (tray) buildMenu();
  const T = t();
  const balloon = content => tray && tray.displayBalloon({ title: T.upTitle, content, iconType: 'info' });
  if ((s.state === 'ready' || s.state === 'available') && announced !== s.state + s.latest) {
    announced = s.state + s.latest;
    balloon(s.state === 'ready' ? T.upReadyMsg(s.latest) : T.upAvailableMsg(s.latest));
  } else if (manualCheck && s.state === 'none') { manualCheck = false; balloon(T.upNone(app.getVersion())); }
  else if (manualCheck && s.state === 'error') { manualCheck = false; balloon(T.upError(s.error)); }
}
function checkUpdates(manual) {
  if (!updater) return;
  if (!manual && !cfg.autoUpdate) return;
  manualCheck = !!manual;
  updater.check();
}

// ---------- запуск ----------
app.on('second-instance', () => tray && tray.displayBalloon({ title: t().name, content: t().already, iconType: 'info' }));
app.on('window-all-closed', () => {}); // живём в трее
app.on('before-quit', () => { try { server && server.close(); } catch {} restoreBanner(); });

app.whenReady().then(() => {
  loadCfg();
  createWindow();
  createTray();
  startServer();
  const ok = syncHook();
  buildMenu();
  if (cfg.autostart) setAutostart(true); // путь к exe мог измениться
  setInterval(poll, 300);
  // Плашка Windows от десктопного Claude → маскот (даже если хук в сессии ещё не подхватился).
  toasts.watch(() => { if (process.env.MASCOT_DEBUG) console.log('toast from Claude'); if (cfg.toasts) notify(false); });
  // Баннеры Claude: сразу и раз в минуту (Claude мог ещё ни разу не слать уведомлений или появиться позже).
  syncBanner();
  setInterval(() => { if (cfg.replaceBanner) syncBanner(); }, 60000);
  win.on('session-end', restoreBanner); // выход из Windows: before-quit не приходит
  if (!cfg.firstRunDone) {
    cfg.firstRunDone = true; saveCfg();
    tray.displayBalloon({
      title: t().started,
      content: ok ? t().startedOk : t().startedErr(hook.settingsPath(), hookError),
      iconType: ok ? 'info' : 'warning',
    });
  }
  // Обновления: через 15 с после запуска и раз в 6 часов.
  updater = updaterLib.create(onUpdate);
  buildMenu();
  setTimeout(() => checkUpdates(false), 15000);
  setInterval(() => checkUpdates(false), 6 * 3600 * 1000);
});
