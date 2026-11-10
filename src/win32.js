// Работа с окнами Windows через koffi (без нативной сборки).
const path = require('path');
const koffi = require('koffi');

const u = koffi.load('user32.dll');
const k = koffi.load('kernel32.dll');

const GetForegroundWindow = u.func('intptr_t __stdcall GetForegroundWindow()');
const GetWindowThreadProcessId = u.func('uint32_t __stdcall GetWindowThreadProcessId(intptr_t hWnd, _Out_ uint32_t *pid)');
const GetWindowTextW = u.func('int __stdcall GetWindowTextW(intptr_t hWnd, void *buf, int n)');
const IsWindow = u.func('int __stdcall IsWindow(intptr_t hWnd)');
const IsWindowVisible = u.func('int __stdcall IsWindowVisible(intptr_t hWnd)');
const IsIconic = u.func('int __stdcall IsIconic(intptr_t hWnd)');
const ShowWindow = u.func('int __stdcall ShowWindow(intptr_t hWnd, int cmd)');
const SetForegroundWindow = u.func('int __stdcall SetForegroundWindow(intptr_t hWnd)');
const BringWindowToTop = u.func('int __stdcall BringWindowToTop(intptr_t hWnd)');
const GetWindow = u.func('intptr_t __stdcall GetWindow(intptr_t hWnd, uint32_t cmd)');
const keybd_event = u.func('void __stdcall keybd_event(uint8_t vk, uint8_t scan, uint32_t flags, uintptr_t extra)');
const EnumWindowsProc = koffi.proto('int __stdcall EnumWindowsProc(intptr_t hWnd, intptr_t lp)');
const EnumWindows = u.func('int __stdcall EnumWindows(EnumWindowsProc *cb, intptr_t lp)');

const OpenProcess = k.func('intptr_t __stdcall OpenProcess(uint32_t access, int inherit, uint32_t pid)');
const QueryFullProcessImageNameW = k.func('int __stdcall QueryFullProcessImageNameW(intptr_t h, uint32_t flags, void *buf, _Inout_ uint32_t *size)');
const CloseHandle = k.func('int __stdcall CloseHandle(intptr_t h)');

const SW_RESTORE = 9, SW_SHOW = 5, GW_OWNER = 4, VK_MENU = 0x12, KEYUP = 2;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

const pathCache = new Map();

function pidOf(hwnd) {
  const p = [0];
  GetWindowThreadProcessId(hwnd, p);
  return p[0];
}

function exePath(pid) {
  if (!pid) return '';
  if (pathCache.has(pid)) return pathCache.get(pid);
  let res = '';
  const h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
  if (h) {
    const buf = Buffer.alloc(2048);
    const size = [1024];
    if (QueryFullProcessImageNameW(h, 0, buf, size)) res = buf.toString('utf16le', 0, size[0] * 2);
    CloseHandle(h);
  }
  if (pathCache.size > 300) pathCache.clear();
  if (res) pathCache.set(pid, res);
  return res;
}

function title(hwnd) {
  const buf = Buffer.alloc(1024);
  const n = GetWindowTextW(hwnd, buf, 511);
  return n > 0 ? buf.toString('utf16le', 0, n * 2) : '';
}

function info(hwnd) {
  if (!hwnd) return null;
  const pid = pidOf(hwnd);
  const full = exePath(pid);
  return { hwnd, pid, path: full, exe: path.basename(full).toLowerCase(), title: title(hwnd) };
}

function foreground() {
  return info(GetForegroundWindow());
}

// Окна верхнего уровня (без владельца) процесса с данным именем exe.
function windowsOf(exe, { visibleOnly = true } = {}) {
  const out = [];
  EnumWindows(hwnd => {
    if (GetWindow(hwnd, GW_OWNER)) return 1;
    const vis = !!IsWindowVisible(hwnd);
    if (visibleOnly && !vis) return 1;
    const i = info(hwnd);
    if (i.exe === exe && i.title) out.push({ ...i, visible: vis });
    return 1;
  }, 0);
  return out;
}

function alive(hwnd) {
  return !!hwnd && !!IsWindow(hwnd) && !!IsWindowVisible(hwnd);
}

function activate(hwnd) {
  if (IsIconic(hwnd)) ShowWindow(hwnd, SW_RESTORE); else ShowWindow(hwnd, SW_SHOW);
  if (SetForegroundWindow(hwnd)) return true;
  // Обход запрета смены фокуса: «нажатие» Alt даёт процессу право на SetForegroundWindow.
  keybd_event(VK_MENU, 0, 0, 0);
  keybd_event(VK_MENU, 0, KEYUP, 0);
  BringWindowToTop(hwnd);
  return !!SetForegroundWindow(hwnd);
}

module.exports = { foreground, windowsOf, alive, activate };
