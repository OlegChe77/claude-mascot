// Interface strings. Language: cfg.lang ('auto' | 'en' | 'ru'); 'auto' follows the Windows language.
const { app } = require('electron');

const T = {
  en: {
    name: 'Mascot',
    sizes: ['Normal', 'Large', 'Extra large'],
    test: 'Show test',
    size: 'Size',
    sound: 'Sound',
    autostart: 'Start with Windows',
    language: 'Language',
    langAuto: 'Auto (system)',
    replaceBanner: 'Replace Claude pop-ups with the mascot',
    toasts: 'React to Claude pop-ups (desktop app)',
    hook: 'React to Claude Code (hook)',
    hookError: 'Claude Code hook (settings.json error)',
    stopHook: 'Also call after every Claude reply (Stop)',
    donate: 'Support the project',
    quit: 'Quit',
    tooltip: 'Mascot — calls you when Claude is waiting for you',
    already: 'Mascot is already running — it is in the tray.',
    started: 'Mascot is running',
    startedOk: 'I live in the tray. The Claude Code hook is installed — I will call you when Claude is waiting for your answer.',
    startedErr: (p, e) => `Could not add the hook to ${p}: ${e}`,
    settingsErr: (p, e) => `Could not change ${p}:\n${e}`,
    portBusy: port => `Port ${port} is already used by another program. Mascot will not receive signals from Claude.`,
    portErr: (port, e) => `Could not open port ${port}: ${e}`,
    // updates
    upCheck: 'Check for updates',
    upChecking: 'Checking for updates…',
    upDownloading: v => `Downloading update ${v}…`,
    upReady: v => `Restart and update to ${v}`,
    upAvailable: v => `Download version ${v}`,
    upAuto: 'Update automatically',
    upNone: v => `You have the latest version (${v}).`,
    upError: e => `Could not check for updates: ${e}`,
    upReadyMsg: v => `Version ${v} is downloaded. It will be installed when Mascot restarts — or choose “Restart and update” in the tray menu.`,
    upAvailableMsg: v => `Version ${v} is available. Choose “Download” in the tray menu.`,
    upTitle: 'Mascot update',
  },
  ru: {
    name: 'Маскот',
    sizes: ['Обычный', 'Крупный', 'Очень крупный'],
    test: 'Показать тест',
    size: 'Размер',
    sound: 'Звук',
    autostart: 'Автозапуск с Windows',
    language: 'Язык',
    langAuto: 'Авто (как в системе)',
    replaceBanner: 'Заменять плашку Claude маскотом',
    toasts: 'Сигнал от плашек Claude (десктоп)',
    hook: 'Сигнал от Claude Code (хук)',
    hookError: 'Хук Claude Code (ошибка settings.json)',
    stopHook: 'Звать и после каждого ответа Claude (Stop)',
    donate: 'Помощь проекту',
    quit: 'Выход',
    tooltip: 'Маскот — позовёт, когда Claude ждёт ответа',
    already: 'Маскот уже запущен — он в трее.',
    started: 'Маскот запущен',
    startedOk: 'Живу в трее. Хук Claude Code установлен — позову, когда Claude будет ждать ответа.',
    startedErr: (p, e) => `Не удалось прописать хук в ${p}: ${e}`,
    settingsErr: (p, e) => `Не удалось изменить ${p}:\n${e}`,
    portBusy: port => `Порт ${port} уже занят другой программой. Маскот не сможет получать сигналы от Claude.`,
    portErr: (port, e) => `Не удалось открыть порт ${port}: ${e}`,
    upCheck: 'Проверить обновления',
    upChecking: 'Проверяю обновления…',
    upDownloading: v => `Скачиваю обновление ${v}…`,
    upReady: v => `Перезапустить и обновить до ${v}`,
    upAvailable: v => `Скачать версию ${v}`,
    upAuto: 'Обновлять автоматически',
    upNone: v => `У вас последняя версия (${v}).`,
    upError: e => `Не удалось проверить обновления: ${e}`,
    upReadyMsg: v => `Версия ${v} скачана. Установится при перезапуске Маскота — или выберите «Перезапустить и обновить» в меню трея.`,
    upAvailableMsg: v => `Доступна версия ${v}. Выберите «Скачать» в меню трея.`,
    upTitle: 'Обновление Маскота',
  },
};

const LANGS = [['en', 'English'], ['ru', 'Русский']];

function systemLang() {
  let l = '';
  try { l = (app.getPreferredSystemLanguages()[0] || app.getLocale() || ''); } catch {}
  return /^ru/i.test(l) ? 'ru' : 'en';
}
const resolve = pref => (T[pref] ? pref : systemLang());

module.exports = { T, LANGS, resolve };
