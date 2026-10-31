# Zenski Screen Timeout

A Windows tray app that watches for idle time and then takes over every
monitor with an animated GIF character and a forced rest countdown. It can
optionally lock your keyboard and mouse until the break is over.

There is also a single-file **web demo** that shows the characters, audio and
countdown in a browser. It cannot lock input (see "What the web demo can't do").

---

## What's in this repo

```
zenski-native/
├── main.js            Tray, idle detection, overlay windows, BlockInput (the only file that touches the OS)
├── preload.js         Bridge for the overlay window (resume / close preview only)
├── settingsPreload.js Bridge for the settings window (get / save / toggle / preview)
├── overlay.html       Fullscreen overlay: GIF, name, countdown, Resume button
├── overlay.js         CHARACTERS list, countdown logic, audio melodies
├── settings.html      Settings window
├── icon.ico           Tray icon
├── gifs/              Character GIFs, referenced by filename in overlay.js
└── package.json

zenski-web-demo.html   Single self-contained browser demo (GIFs embedded)
```

## Requirements

- Windows 10 or 11 (input blocking uses the Win32 `BlockInput` API)
- Node.js 18 or newer

## Run it

From PowerShell, inside the `zenski-native` folder:

```powershell
npm install
npm start
```

Later runs only need `npm start`.

On launch, a Settings window opens and a paw icon appears in the system tray.
Windows often hides new tray icons under the `^` arrow near the clock.

Watching never starts by itself. You press **Start Watching** (in the Settings
window or the tray menu) each session, because this app can lock your input.

## How to try it without waiting two hours

1. Open the tray menu or Settings window and choose **Preview Character**. It
   shows the overlay immediately, with no countdown and no input lock.
2. To test the real forced break, set **Idle timeout** to 1 minute and
   **Forced rest** to 1 minute, and leave **Block keyboard/mouse** unchecked.
   Press **Start Watching** and leave the machine alone for a minute.
3. Turn input blocking on only after steps 1 and 2 behave the way you expect.

## Settings

| Setting | Default | Notes |
|---|---|---|
| Idle timeout | 120 min | Real OS-level idle time via Electron `powerMonitor` |
| Forced rest | 5 min | Hard-capped at 20 in `sanitizeSettings()` in `main.js` |
| Block keyboard/mouse | on | Calls Win32 `BlockInput`. Test with it off first |
| Audio | on | Short melodies generated with the Web Audio API |
| Volume | 70 | 0 to 100 |
| Character | cat | Any of the 8 characters |

Settings are saved as JSON in Electron's `userData` folder
(`%APPDATA%\zenski-screen-timeout-native\settings.json`).

## Safety: read before turning input blocking on

- **Ctrl+Alt+Del** and **Ctrl+Shift+Esc** are reserved by Windows. No normal
  program can block them, so Task Manager is always available. If anything goes
  wrong, end `electron.exe` there and Windows releases the input lock.
- A **failsafe timer** releases everything `forcedRestMinutes + 2 minutes` after
  the break starts, even if the overlay window crashes or never reports back.
- Input is also unblocked on quit, on crash (`uncaughtException`), and on
  SIGINT/SIGTERM.
- Alt+F4 is ignored on overlay windows during a real forced break. Preview
  windows close normally.
- Some security software intercepts or blocks `BlockInput`. If that happens, the
  overlay and countdown still run, but the input lock does not.

## Change a character

Each character is one entry in `CHARACTERS` in `overlay.js`:

```js
cat: {
  label: '🐱 Whiskers the Cat', type: 'pet', gif: 'gifs/1.gif', accent: '#ffe08a',
  song: 'purrs a cheerful little tune',
  melody: [[523, 0.18], [659, 0.18], [784, 0.18], [659, 0.18], [523, 0.3]]
},
```

- `gif`: path to the file in `gifs/`. Swap the filename to change the image.
- `type`: `'pet'` or `'horror'`. Horror adds scanlines and lightning flashes.
- `accent`: hex color for the name text glow.
- `melody`: list of `[frequencyHz, durationSeconds]` notes.

To add a new character, add an entry in `overlay.js` **and** add its key and
label to the `CHARACTERS` list inside the `<script>` in `settings.html`, so it
shows up in the dropdown.

The default GIF mapping is: cat 1, dog 9, rabbit 6, demogorgon 3, vecna 2,
mindflayer 5, demodogs 4, eleven 8. `7.gif` and `10.gif` are unused.

## Web demo

Open `zenski-web-demo.html` in any browser. No install or server is needed. It
has a character gallery, a fullscreen preview with audio, and an idle timer
that defaults to 2 minutes idle and 1 minute forced rest so you can see it
trigger quickly.

### What the web demo can't do

- It cannot lock your keyboard or mouse. Browsers don't allow it.
- Idle detection only sees mouse and keyboard activity inside that tab.
- Its fullscreen takeover only covers the tab. You can always switch away or
  close it.

Only the native app can enforce a break at the OS level.

## Known issues

- **Tray icon missing.** If the icon doesn't show, check the `^` overflow area
  first. The Settings window opening on launch is the real sign that startup
  worked. `main.js` falls back to a base64 icon if `icon.ico` is missing, and
  that fallback has been unreliable. Keep `icon.ico` next to `main.js`.
- **No startup error dialog.** `app.whenReady().then(initializeApp)` has no
  `.catch()`, so a failure during startup can be silent. Adding a `.catch()` that
  shows `dialog.showErrorBox(...)` fixes this.
- **Stale test.** The test in `tests/` still asserts that `overlay.html` loads
  `./renderer/vendor/three.min.js`. The overlay now uses `<img id="char-gif">`
  and no Three.js, so that assertion should check for the `char-gif` image tag
  instead.
- **GIFs not showing.** Confirm `overlay.html` contains `char-gif`, `overlay.js`
  contains `gif:` paths, and the `gifs/` folder sits next to them.

## Copyright note on the GIFs

Some of the bundled GIFs show characters from Marvel and Dragon Ball. That is
fine for private use on your own machine. Replace them with your own artwork or
properly licensed images before publishing or sharing this project.

## Contributing

1. Fork the repo and create a branch.
2. Add or change characters in `overlay.js` and `settings.html`.
3. Test with **Preview Character** before testing the forced break.
4. Keep input-blocking behavior and the failsafe timer intact in any change to
   `main.js`.
5. Open a pull request describing what you changed and how you tested it.

## License

MIT. Use it, change it, and give credit.
