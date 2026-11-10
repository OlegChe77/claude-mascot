// Генерация иконок из SVG маскота: npm run icons  (запускается через electron)
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');

const svg = ping => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 0 116 116">
<defs><clipPath id="cb"><rect x="18" y="10" width="84" height="72" rx="28"/></clipPath></defs>
<g fill="#C2603F"><rect x="30" y="72" width="10" height="24" rx="5"/><rect x="45" y="72" width="10" height="24" rx="5"/>
<rect x="66" y="72" width="10" height="24" rx="5"/><rect x="81" y="72" width="10" height="24" rx="5"/>
<ellipse cx="15" cy="52" rx="11" ry="9"/><ellipse cx="105" cy="52" rx="11" ry="9"/></g>
<ellipse fill="#E08463" cx="14" cy="50" rx="9" ry="7"/>
<g clip-path="url(#cb)"><rect fill="#C2603F" x="18" y="10" width="84" height="72"/><ellipse fill="#E08463" cx="54" cy="38" rx="56" ry="40"/><ellipse fill="#F8C3AC" cx="42" cy="22" rx="20" ry="7" transform="rotate(-14 42 22)" opacity=".75"/></g>
<ellipse cx="44" cy="44" rx="7" ry="9" fill="#2a1a14"/><circle cx="46.5" cy="40.5" r="2.8" fill="#fff"/>
<ellipse cx="76" cy="44" rx="7" ry="9" fill="#2a1a14"/><circle cx="78.5" cy="40.5" r="2.8" fill="#fff"/>
<path d="M53 61 Q60 67 67 61" fill="none" stroke="#2a1a14" stroke-width="3.5" stroke-linecap="round"/>
${ping ? '<circle cx="98" cy="20" r="18" fill="#E24B4A" stroke="#fff" stroke-width="5"/>' : ''}
</svg>`;

// ICO с PNG внутри (поддерживается с Windows Vista).
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(([size, buf], i) => {
    const e = 6 + 16 * i;
    head[e] = size >= 256 ? 0 : size; head[e + 1] = size >= 256 ? 0 : size;
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += buf.length;
  });
  return Buffer.concat([head, ...pngs.map(p => p[1])]);
}

app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false });
  await w.loadURL('data:text/html,<html></html>');
  const render = (s, size) => w.webContents.executeJavaScript(`new Promise(r=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=${size};c.getContext('2d').drawImage(i,0,0,${size},${size});r(c.toDataURL('image/png'))};i.src='data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}'})`);
  const png = async (s, size) => Buffer.from((await render(s, size)).split(',')[1], 'base64');

  fs.mkdirSync(OUT, { recursive: true });
  const traySizes = [16, 20, 24, 32, 40, 48, 64];
  for (const [name, ping] of [['tray.ico', false], ['tray-ping.ico', true]]) {
    const list = [];
    for (const s of traySizes) list.push([s, await png(svg(ping), s)]);
    fs.writeFileSync(path.join(OUT, name), ico(list));
  }
  const appSizes = [16, 24, 32, 48, 64, 128, 256];
  const list = [];
  for (const s of appSizes) list.push([s, await png(svg(false), s)]);
  fs.writeFileSync(path.join(OUT, 'icon.ico'), ico(list));
  fs.writeFileSync(path.join(OUT, 'icon.png'), list[list.length - 1][1]);
  console.log('icons ok');
  app.quit();
});
