// ============================================================
//  main.js — Zenski Screen Timeout (native, Windows)
//
//  This process:
//   - watches system idle time (Electron's built-in powerMonitor,
//     no native code needed for that part)
//   - on timeout, opens a full-screen overlay on every monitor
//   - optionally calls the Win32 BlockInput API to lock the
//     keyboard and mouse system-wide for the forced-rest duration
//
//  SAFETY NOTES (read before enabling input blocking):
//   - Windows reserves Ctrl+Alt+Del as a "secure attention sequence"
//     that NO user-mode process — including this one — can block.
//     It always works and always reaches the secure desktop, where
//     you can open Task Manager and end this app instantly.
//   - Ctrl+Shift+Esc (Task Manager) is also part of that reserved
//     sequence and is unaffected by BlockInput.
//   - This app never blocks input for longer than
//     `forcedRestMinutes` + a 2 minute buffer — a hard failsafe
//     timer unblocks and closes everything even if the renderer
//     never reports back.
//   - Input is unblocked in every exit path: normal quit, crash,
//     SIGINT/SIGTERM, and the failsafe timer.
// ============================================================

const { app, BrowserWindow, Tray, Menu, screen, powerMonitor, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// ---------------------------------------------------------------
// Win32 BlockInput binding (64-bit Windows; x64 has one calling
// convention so we don't need to worry about stdcall vs cdecl here)
// ---------------------------------------------------------------
let BlockInput = null;
try {
  const koffi = require('koffi');
  const user32 = koffi.load('user32.dll');
  // BOOL BlockInput(BOOL fBlockIt); — Win32 BOOL is a 4-byte int, not a C++ bool.
  BlockInput = user32.func('int BlockInput(int fBlockIt)');
} catch (e) {
  console.error('[zenski] Could not load user32.dll BlockInput — input blocking will be disabled.', e);
}

let inputBlocked = false;
function setInputBlocked(state) {
  if (!BlockInput) return;
  try {
    BlockInput(state ? 1 : 0);
    inputBlocked = state;
  } catch (e) {
    console.error('[zenski] BlockInput call failed:', e);
  }
}
function emergencyUnblock() {
  if (inputBlocked) setInputBlocked(false);
}

// ---------------------------------------------------------------
// Settings — persisted as plain JSON in the userData folder
// ---------------------------------------------------------------
const DEFAULT_SETTINGS = {
  character: 'cat',
  timeoutMinutes: 120,
  forcedRestMinutes: 5,   // hard-capped at 20 in sanitizeSettings, see below
  blockInput: true,
  audioEnabled: true,
  volume: 70
};
let settings = { ...DEFAULT_SETTINGS };

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}
function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    settings = sanitizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}
function persistSettings() {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('[zenski] Failed to persist settings:', e);
  }
}
function sanitizeSettings(s) {
  return {
    character: typeof s.character === 'string' ? s.character : DEFAULT_SETTINGS.character,
    timeoutMinutes: Math.max(1, Number(s.timeoutMinutes) || DEFAULT_SETTINGS.timeoutMinutes),
    // Capped at 20 minutes — this is a wellness nudge, not a punishment.
    // Raise the cap yourself in this file if you deliberately want longer.
    forcedRestMinutes: Math.min(20, Math.max(0, Number(s.forcedRestMinutes) ?? DEFAULT_SETTINGS.forcedRestMinutes)),
    blockInput: !!s.blockInput,
    audioEnabled: !!s.audioEnabled,
    volume: Math.min(100, Math.max(0, Number(s.volume) ?? DEFAULT_SETTINGS.volume))
  };
}

// ---------------------------------------------------------------
// State
// ---------------------------------------------------------------
let tray = null;
let watching = false;
let idlePollInterval = null;
let forcedActive = false;
let failsafeTimer = null;
let overlayWindows = [];
let settingsWindow = null;

// ---------------------------------------------------------------
// Idle watching
// ---------------------------------------------------------------
function startWatching() {
  if (watching) return;
  watching = true;
  idlePollInterval = setInterval(checkIdle, 5000);
  refreshTray();
}
function stopWatching() {
  watching = false;
  clearInterval(idlePollInterval);
  idlePollInterval = null;
  refreshTray();
}
function checkIdle() {
  if (forcedActive) return;
  const idleSec = powerMonitor.getSystemIdleTime();
  if (idleSec >= settings.timeoutMinutes * 60) {
    triggerForcedBreak(false);
  }
}

// ---------------------------------------------------------------
// Forced break overlay
// ---------------------------------------------------------------
function triggerForcedBreak(isPreview) {
  if (forcedActive && !isPreview) return;
  forcedActive = !isPreview ? true : forcedActive;

  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;
  overlayWindows.forEach(w => { if (!w.isDestroyed()) w.destroy(); });
  overlayWindows = displays.map(d => createOverlayWindow(d, d.id === primaryId, isPreview));

  if (!isPreview && settings.blockInput) {
    setInputBlocked(true);
  }

  if (!isPreview) {
    const failsafeMs = (settings.forcedRestMinutes + 2) * 60 * 1000;
    clearTimeout(failsafeTimer);
    failsafeTimer = setTimeout(() => {
      console.warn('[zenski] Failsafe fired — force releasing the break.');
      releaseForcedBreak();
    }, failsafeMs);
  }
}

function releaseForcedBreak() {
  forcedActive = false;
  clearTimeout(failsafeTimer);
  failsafeTimer = null;
  emergencyUnblock();
  overlayWindows.forEach(w => { if (!w.isDestroyed()) w.destroy(); });
  overlayWindows = [];
}

function createOverlayWindow(display, isPrimary, isPreview) {
  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    show: false,
    fullscreen: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true,
    backgroundColor: '#0a0014',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // During a real forced break, refuse to be closed by Alt+F4 etc.
  // (Ctrl+Alt+Del / Task Manager always still work — see safety notes above.)
  win.on('close', (e) => {
    if (forcedActive && !isPreview) e.preventDefault();
  });

  win.once('ready-to-show', () => win.show());

  const params = new URLSearchParams({
    character: settings.character,
    audioEnabled: String(settings.audioEnabled),
    volume: String(settings.volume),
    forcedSeconds: String(isPreview ? 0 : settings.forcedRestMinutes * 60),
    isPrimary: isPrimary ? '1' : '0',
    isPreview: isPreview ? '1' : '0'
  });
  win.loadFile(path.join(__dirname, 'overlay.html'), { search: params.toString() });
  return win;
}

// ---------------------------------------------------------------
// IPC from overlay window
// ---------------------------------------------------------------
ipcMain.on('resume-requested', () => {
  releaseForcedBreak();
});
ipcMain.on('preview-close-requested', () => {
  overlayWindows.forEach(w => { if (!w.isDestroyed()) w.destroy(); });
  overlayWindows = [];
});

// ---------------------------------------------------------------
// IPC from settings window
// ---------------------------------------------------------------
ipcMain.handle('settings-get', () => settings);
ipcMain.handle('settings-save', (_evt, incoming) => {
  settings = sanitizeSettings(incoming);
  persistSettings();
  refreshTray();
  return settings;
});
ipcMain.handle('watch-toggle', () => {
  if (watching) stopWatching(); else startWatching();
  return watching;
});
ipcMain.handle('watch-state', () => watching);
ipcMain.handle('trigger-preview', () => {
  triggerForcedBreak(true);
  return true;
});

// ---------------------------------------------------------------
// Settings window
// ---------------------------------------------------------------
function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 380,
    height: 560,
    resizable: false,
    title: 'Zenski Settings',
    backgroundColor: '#120022',
    webPreferences: {
      preload: path.join(__dirname, 'settingsPreload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
}

// ---------------------------------------------------------------
// Tray
// ---------------------------------------------------------------
function getTrayIcon() {
  const iconPath = path.join(__dirname, 'icon.ico');
  if (fs.existsSync(iconPath)) return iconPath;
  // Tiny embedded fallback icon so Tray construction never fails
  // if you haven't dropped your own icon.ico into the project root yet.
  const fallbackPng =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAI0lEQVR4AWNgGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBWMFAJs8AV9Fh8N3AAAAAElFTkSuQmCC';
  return nativeImage.createFromDataURL(fallbackPng);
}

function refreshTray() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: watching ? 'Stop Watching' : 'Start Watching',
      click: () => (watching ? stopWatching() : startWatching())
    },
    { label: 'Preview Character', click: () => triggerForcedBreak(true) },
    { label: 'Settings…', click: openSettingsWindow },
    { type: 'separator' },
    {
      label: `Idle timeout: ${settings.timeoutMinutes} min`,
      enabled: false
    },
    {
      label: `Forced rest: ${settings.forcedRestMinutes} min`,
      enabled: false
    },
    {
      label: `Input blocking: ${settings.blockInput ? 'ON' : 'OFF'}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Quit Zenski',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip(`Zenski Screen Timeout — ${watching ? 'watching' : 'stopped'}`);
}

// ---------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------
app.whenReady().then(() => {
  loadSettings();
  tray = new Tray(getTrayIcon());
  refreshTray();
  // NOTE: watching does NOT auto-start. Given this app can lock your
  // keyboard and mouse, you opt in explicitly from the tray menu each
  // session rather than it silently arming itself on launch.
});

app.on('window-all-closed', (e) => {
  // Tray app — stay alive even with no windows open.
  e.preventDefault();
});

app.on('before-quit', emergencyUnblock);
app.on('will-quit', emergencyUnblock);
process.on('uncaughtException', (err) => {
  console.error('[zenski] Uncaught exception:', err);
  emergencyUnblock();
});
process.on('SIGINT', () => { emergencyUnblock(); process.exit(0); });
process.on('SIGTERM', () => { emergencyUnblock(); process.exit(0); });
