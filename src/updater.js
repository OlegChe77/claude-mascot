// Updates from GitHub Releases.
// Installed (NSIS) version: electron-updater downloads in the background and installs on restart.
// Portable version cannot replace itself: it only checks the latest release and offers the download page.
const { app, net, shell } = require('electron');

const REPO = 'OlegChe77/claude-mascot';
const RELEASES = `https://github.com/${REPO}/releases/latest`;
const API = `https://api.github.com/repos/${REPO}/releases/latest`;

const short = e => String((e && e.message) || e).split('\n')[0].slice(0, 200);
const parts = v => String(v).replace(/^v/i, '').split(/[.-]/).map(n => parseInt(n, 10) || 0);
function newer(a, b) {
  const x = parts(a), y = parts(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

function create(onChange) {
  const portable = !!process.env.PORTABLE_EXECUTABLE_FILE;
  const st = { state: 'idle', latest: null, error: null, portable };
  const set = p => { Object.assign(st, p); try { onChange({ ...st }); } catch {} };
  let au = null;

  function auto() {
    if (au) return au;
    au = require('electron-updater').autoUpdater;
    au.autoDownload = true;
    au.autoInstallOnAppQuit = true;
    au.logger = null;
    au.on('checking-for-update', () => set({ state: 'checking', error: null }));
    au.on('update-available', i => set({ state: 'downloading', latest: i.version }));
    au.on('update-not-available', () => set({ state: 'none' }));
    au.on('update-downloaded', i => set({ state: 'ready', latest: i.version }));
    au.on('error', e => set({ state: 'error', error: short(e) }));
    return au;
  }

  async function checkPortable() {
    set({ state: 'checking', error: null });
    const r = await net.fetch(API, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Mascot-updater' } });
    if (!r.ok) throw new Error('GitHub: HTTP ' + r.status);
    const v = String((await r.json()).tag_name || '').replace(/^v/i, '');
    set(v && newer(v, app.getVersion()) ? { state: 'available', latest: v } : { state: 'none' });
  }

  async function check() {
    if (!app.isPackaged) return { ...st };
    if (st.state === 'ready' || st.state === 'downloading') return { ...st };
    try { if (portable) await checkPortable(); else await auto().checkForUpdates(); }
    catch (e) { set({ state: 'error', error: short(e) }); }
    return { ...st };
  }

  function install() {
    if (portable) shell.openExternal(RELEASES);
    else if (st.state === 'ready') auto().quitAndInstall(true, true);
  }

  return { check, install, get: () => ({ ...st }), supported: () => app.isPackaged };
}

module.exports = { create, newer, RELEASES };
