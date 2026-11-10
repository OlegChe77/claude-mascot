<p align="center">
  <a href="https://dalink.to/olegche"><img src="docs/donate.svg" width="388" height="72" alt="❤ Помощь проекту"></a>
</p>

<h1 align="center">Маскот</h1>

<p align="center">
  <b>Маленький оранжевый помощник, который напомнит, что Claude ждёт вашего ответа.</b><br>
  <b>Русский</b> · <a href="README.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/OlegChe77/claude-mascot/releases/latest"><img alt="Последняя версия" src="https://img.shields.io/github/v/release/OlegChe77/claude-mascot?label=%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D1%8F&color=e08463"></a>
  <a href="https://github.com/OlegChe77/claude-mascot/releases"><img alt="Скачиваний" src="https://img.shields.io/github/downloads/OlegChe77/claude-mascot/total?label=%D1%81%D0%BA%D0%B0%D1%87%D0%B8%D0%B2%D0%B0%D0%BD%D0%B8%D0%B9&color=2ea44f"></a>
  <a href="LICENSE"><img alt="Лицензия MIT" src="https://img.shields.io/badge/%D0%BB%D0%B8%D1%86%D0%B5%D0%BD%D0%B7%D0%B8%D1%8F-MIT-lightgrey"></a>
  <a href="#скачать"><img alt="Windows 10 и 11" src="https://img.shields.io/badge/Windows-10%20%7C%2011-0078d6"></a>
  <a href="#автообновление"><img alt="Автообновление" src="https://img.shields.io/badge/%D0%B0%D0%B2%D1%82%D0%BE%D0%BE%D0%B1%D0%BD%D0%BE%D0%B2%D0%BB%D0%B5%D0%BD%D0%B8%D0%B5-%D0%B5%D1%81%D1%82%D1%8C-brightgreen"></a>
</p>

<p align="center">
  <img src="docs/screenshots/ru/peek.gif" width="640" alt="Маскот выглядывает из правого нижнего угла экрана и говорит: Пс-с… загляни в Claude">
</p>

Маленький оранжевый маскот для Windows: выглядывает из правого нижнего угла экрана, когда Claude (Claude Code или десктопное приложение) ждёт вашего ответа, а окно Claude свёрнуто или не активно. Больше никаких забытых запросов разрешения.

## Скачать

**[⬇ Последний выпуск](https://github.com/OlegChe77/claude-mascot/releases/latest)**

- `Mascot-Setup-<версия>.exe` — установщик. **Обновляется сам.**
- `Mascot-<версия>-portable.exe` — один файл без установки. Сообщает о новой версии.

## Как он себя ведёт

1. **Выглядывает** из правого нижнего угла три раза, каждый раз говорит несколько фраз. На третий — уже недоволен.
2. **Злится.** Потом выходит целиком на 20 секунд: краснеет, топает по низу экрана, трясёт кулаками, ворчит.
3. **Повторяет**, пока вы не откликнетесь. Перейдите в Claude или нажмите на маскота — он сразу убежит (клик ещё и разворачивает окно Claude).

Живёт в трее, не забирает фокус, клики проходят сквозь всё, кроме самого маскота. Русский и английский: язык — как в Windows, меняется в меню трея.

|                      Выглядывает                       |                      Недоволен                       |
| :----------------------------------------------------: | :--------------------------------------------------: |
| ![Спокойный маскот](docs/screenshots/ru/01-peek.png) | ![Недовольный маскот](docs/screenshots/ru/02-grumpy.png) |

|                        Злится                         |                 Меню трея                  |
| :---------------------------------------------------: | :----------------------------------------: |
| ![Злой красный маскот](docs/screenshots/ru/03-angry.png) | ![Меню трея](docs/screenshots/ru/04-tray.png) |

<p align="center">
  <img src="docs/screenshots/ru/angry.gif" width="800" alt="Злой маскот ходит по низу экрана и ворчит">
</p>

## Автообновление

Маскот проверяет GitHub Releases через 15 секунд после запуска и потом раз в 6 часов. Отключить можно пунктом трея **«Обновлять автоматически»**, проверить вручную — **«Проверить обновления»**.

- **Установщик** (`Mascot-Setup-….exe`) — **обновляется сам.** Новая версия скачивается в фоне и ставится при следующем перезапуске Маскота (или сразу — пунктом **«Перезапустить и обновить»** в меню трея). От вас ничего не требуется.
- **Portable** (`Mascot-….-portable.exe`) — не может заменить собственный файл, поэтому только **сообщает** о новой версии (уведомление из трея), а по пункту **«Скачать»** открывает страницу загрузки.

## Откуда он знает, что Claude ждёт

- **Хуки Claude Code.** При запуске маскот прописывает хуки (`Notification`, `PermissionRequest`, `PreToolUse` для `AskUserQuestion|ExitPlanMode`, по желанию `Stop`) в `~/.claude/settings.json`, с бэкапом. Команда хука — `curl … http://127.0.0.1:47821/hook || exit 0`: если маскот не запущен, она молча ничего не делает.
- **Плашки десктопного Claude.** Новые уведомления Claude в базе уведомлений Windows тоже зовут маскота.
- **«Заменять плашку Claude маскотом»** (по умолчанию вкл) выключает всплывающие баннеры Claude, записи в центре уведомлений остаются. Выключение пункта и выход возвращают прежнюю настройку.

## Сборка

```bash
npm install
npm start
npm run dist
```

`npm run dist` собирает установщик и portable-exe в `dist/`.

Выпуск: поднять `version` в `package.json`, отправить тег `v<версия>` — GitHub Actions соберёт и опубликует выпуск, установленные копии обновятся сами.

## Помощь проекту

Если маскот сделал ваш день чуть приятнее, можно сказать спасибо:

<p align="center">
  <a href="https://dalink.to/olegche"><img src="docs/donate.svg" width="388" height="72" alt="❤ Помощь проекту"></a>
</p>

## Лицензия

[MIT](LICENSE)
