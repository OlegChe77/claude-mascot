const { contextBridge, ipcRenderer } = require('electron');

const IN = new Set(['notify', 'leave', 'sound', 'status', 'lang']);

contextBridge.exposeInMainWorld('api', {
  on: (ch, fn) => { if (IN.has(ch)) ipcRenderer.on(ch, (_e, ...a) => fn(...a)); },
  mouse: over => ipcRenderer.send('mouse', !!over),
  clicked: () => ipcRenderer.send('clicked'),
  idle: () => ipcRenderer.send('idle'),
  ping: on => ipcRenderer.send('ping', !!on),
  status: s => ipcRenderer.send('status', s),
});
