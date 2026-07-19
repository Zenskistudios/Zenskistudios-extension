# Zenski Screen Timeout — Native (Windows)

A tray app that watches for idle time and forces a real rest break: a
full-screen, animated 3D character on every monitor, with your keyboard
and mouse optionally locked for the duration.

This is **not** a browser page — it's a real Windows background process
using Electron's `powerMonitor` for idle detection and the Win32
`BlockInput` API for input locking, so it can actually hold your session
until the timer runs out, the way tools like Workrave or SafeEyes do.

## Setup

```bash
npm install
npm start
```

`npm install` automatically copies `three.min.js` into `renderer/vendor/`
via the `postinstall` script, so the overlay never needs internet access
to render.

The app runs from the system tray (bottom-right, may be under the "hidden
icons" chevron). Right-click the tray icon for the menu, or use
**Settings…** for the full panel.

## Important: input blocking is off by default in spirit, on by default in the settings file

`blockInput` defaults to `true` in `main.js`'s `DEFAULT_SETTINGS`, but
**watching never auto-starts** — you have to click "Start Watching"
yourself each session. That's deliberate: this app can lock your keyboard
and mouse, so it never arms itself silently. Before you trust it, test
with input blocking turned OFF (uncheck it in Settings) and confirm the
overlay, countdown, and Resume button behave the way you expect. Only
turn blocking on once you're comfortable.

## Safety valves — read this before enabling input blocking

- **Ctrl+Alt+Del** is a Windows-reserved "secure attention sequence."
  No user-mode process, including this one, can block it. It always
  works and takes you to the secure desktop, where Task Manager is
  available.
- **Ctrl+Shift+Esc** (direct to Task Manager) is part of that same
  reserved sequence and is also never blocked.
- If you ever need to kill the app immediately: Task Manager →
  find `electron.exe` (or however you've packaged/renamed it) → End Task.
  This releases `BlockInput` instantly (Windows itself releases input
  blocks held by a process that terminates).
- The app also **never blocks longer than `forcedRestMinutes + 2
  minutes`** — a failsafe timer in `main.js` force-releases everything
  even if the overlay window's renderer crashes or never reports back.
- `forcedRestMinutes` is hard-capped at 20 in `sanitizeSettings()` in
  `main.js`. If you deliberately want longer forced breaks, that's a
  one-line change, but the cap is there so a typo in the settings panel
  (e.g. "500" instead of "5") can't lock you out for hours.

## Project structure

```
zenski-native/
├── main.js              — tray, idle watching, BlockInput, window management
├── preload.js            — bridge for the overlay window (resume/close only)
├── settingsPreload.js    — bridge for the settings window (get/save/toggle/preview)
├── overlay.html/.js      — the full-screen 3D character + countdown UI
├── settings.html          — tray settings panel
├── scripts/copy-three.js — postinstall: vendors three.js locally
├── renderer/vendor/       — three.min.js lands here after npm install
└── package.json
```

## Characters

Same 8 as the original VS Code extension, now real Three.js 3D models
with per-character dance animations and the original Web Audio melodies:
Whiskers (cat), Biscuit (dog), Bun-Bun (rabbit), Demogorgon, Vecna, Mind
Flayer, Demo-dogs, and Eleven.

## What this can't do

- Can't survive a reboot or auto-start on login unless you add that
  yourself (e.g. a shortcut in `shell:startup`, or package with
  `electron-builder` and register it as a startup app).
- Can't block input on Linux/macOS — `BlockInput` is Windows-only. A
  Linux build would need `XGrabKeyboard`/`XGrabPointer` (X11) or is
  largely not possible under Wayland; macOS would need Accessibility +
  Input Monitoring permissions and a very different approach.
- Doesn't survive `BlockInput` being denied by some security software —
  a few endpoint-protection suites intercept or block calls to it. If
  that happens on your machine, the overlay still shows and the
  countdown still runs, just without the actual input lock.

## License

MIT, same as the original extension — go wild, have fun, give credit.
