# Mascot

[Русский](README.ru.md)

A little orange mascot for Windows that peeks out of the bottom-right corner of the screen when Claude (Claude Code or the Claude desktop app) is waiting for you — and the Claude window is minimized or in the background.

- Peeks out three times, each time saying a few phrases. The third time it is already grumpy.
- Then it comes out completely and gets angry for 20 seconds: turns red, stomps along the bottom of the screen, shakes its fists and grumbles.
- Repeats until you respond. Switch to Claude or click the mascot — it runs away at once (a click also brings up the Claude window).
- Lives in the tray. Does not steal focus, clicks pass through everything except the mascot itself.
- English and Russian; the language follows Windows and can be changed in the tray menu.

## Download

[Latest release](https://github.com/OlegChe77/claude-mascot/releases/latest):

- `Mascot-Setup-<version>.exe` — installer. **Updates itself**: new versions are downloaded in the background and installed on restart.
- `Mascot-<version>-portable.exe` — single file, no installation. Tells you when a new version is out and opens the download page.

## How it knows Claude is waiting

- **Claude Code hooks.** On start the mascot adds hooks (`Notification`, `PermissionRequest`, `PreToolUse` for `AskUserQuestion|ExitPlanMode`, optionally `Stop`) to `~/.claude/settings.json`, with a backup. The hook command is `curl … http://127.0.0.1:47821/hook || exit 0` — if the mascot is not running, it silently does nothing.
- **Claude desktop pop-ups.** New Claude notifications in the Windows notification database also call the mascot.
- **“Replace Claude pop-ups with the mascot”** (on by default) turns off Claude's notification banners; notifications stay in the Action Center. Turning the option off or quitting restores the previous setting.

## Tray menu

Show test · Size · Language · Sound · Start with Windows · Replace Claude pop-ups with the mascot · React to Claude pop-ups · React to Claude Code (hook) · Also call after every reply (Stop) · Check for updates · Update automatically · Support the project · Quit

## Build from source

```bash
npm install
npm start
npm run dist
```

`npm run dist` builds the installer and the portable exe into `dist/`.

Release: bump `version` in `package.json`, push a tag `v<version>` — GitHub Actions builds and publishes the release, and installed copies update themselves.

## Support the project

https://dalink.to/olegche

## License

MIT
