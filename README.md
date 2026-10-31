# Zenski Screen Timeout

I sit at my desk for hours without moving, so I built something that makes me
get up. After a set idle time, Zenski covers every monitor with a dancing GIF
character and a countdown, and it can lock the keyboard and mouse until the
break is over.

Live demo (browser only, no input lock): https://preview-eight-lake.vercel.app

## Two versions

**Native app (Windows, Electron).** The real thing. It reads actual system idle
time, puts a window on every monitor, and can use the Win32 `BlockInput` call to
lock input.

**Web demo.** One HTML file with the GIFs embedded. A browser tab can't lock
your keyboard, so this only shows the characters, sound and countdown. The
default idle time is 2 minutes so you can watch it trigger.

## Running the native app

You need Windows and Node 18 or newer.

```powershell
cd zenski-native
npm install
npm start
```

A settings window opens and a paw icon goes in the tray. Windows likes to hide
new tray icons under the `^` arrow, so look there if you can't see it.

It never starts watching on its own. Hit "Start Watching" each time you launch
it. Since it can lock your input, I didn't want it arming itself silently.

## Trying it without waiting two hours

Use "Preview Character". It shows the overlay straight away with no countdown
and no lock.

To test a real break, set idle timeout to 1 minute and forced rest to 1 minute,
leave input blocking off, and press Start Watching. Only turn blocking on once
that works the way you expect.

## If input blocking goes wrong

Ctrl+Alt+Del and Ctrl+Shift+Esc can't be blocked by any normal program, so you
can always open Task Manager and end `electron.exe`. Windows releases the lock
when the process dies.

There's also a failsafe in `main.js` that releases everything two minutes after
the forced rest should have ended, and the lock is dropped on quit and on
crashes. Forced rest is capped at 20 minutes so a typo can't lock you out for
hours. Change the cap in `sanitizeSettings()` if you really want longer.

Some antivirus tools block `BlockInput`. If yours does, the overlay and
countdown still work but the lock won't.

## Changing the characters

Each one is an entry in `CHARACTERS` in `overlay.js`:

```js
cat: {
  label: '🐱 Whiskers the Cat', type: 'pet', gif: 'gifs/1.gif', accent: '#ffe08a',
  song: 'purrs a cheerful little tune',
  melody: [[523, 0.18], [659, 0.18], [784, 0.18], [659, 0.18], [523, 0.3]]
},
```

Put your GIF in `gifs/` and change the `gif` path. `type: 'horror'` adds
scanlines and lightning flashes. A melody is a list of `[frequency in Hz,
seconds]` notes. If you add a brand new character, also add it to the list in
`settings.html` or it won't appear in the dropdown.

## Rough edges

- If `icon.ico` goes missing, the tray falls back to an embedded icon that has
  failed before. Keep `icon.ico` next to `main.js`.
- Startup has no error dialog yet, so a failure can be silent. Adding a
  `.catch()` on `app.whenReady()` that shows `dialog.showErrorBox` would fix it.
- The test in `tests/` still expects the old Three.js overlay and needs updating
  to check for the `char-gif` image.

## About the GIFs

Some of the GIFs I'm using are Marvel and Dragon Ball characters. That's fine on
my own machine, but I'll replace them before this goes anywhere public.

## License

MIT.
