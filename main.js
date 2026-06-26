const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

let win;
const BAR_HEIGHT = 37;

function getRunningApps() {
  try {
    const result = execSync(
      `osascript -e 'tell application "System Events" to get name of every process whose background only is false'`,
      { timeout: 3000 }
    ).toString().trim();
    if (result) return result.split(', ').filter(n => n && n !== 'Taskbar' && n !== 'Electron');
  } catch (e) {}

  try {
    const result = execSync('lsappinfo list 2>/dev/null', { timeout: 3000 }).toString();
    const lines = result.split('\n');
    const names = [];
    let current = null;
    for (const line of lines) {
      const nameMatch = line.match(/^\s*\d+\)\s+"([^"]+)"/);
      if (nameMatch) { current = nameMatch[1]; continue; }
      const typeMatch = line.match(/type="([^"]+)"/);
      if (typeMatch && current) {
        if (typeMatch[1] === 'Foreground') names.push(current);
        current = null;
      }
    }
    return [...new Set(names)].filter(n => !['Taskbar', 'Electron'].includes(n));
  } catch (e) {}

  return [];
}

function activateApp(name) {
  try {
    execSync(`osascript -e 'tell application "${name}" to activate'`, { timeout: 2000 });
  } catch (e) {}
}

function quitApp(name) {
  try {
    execSync(`osascript -e 'tell application "${name.replace(/"/g, '\\"')}" to quit'`, { timeout: 3000 });
  } catch (e) {}
}

// Cache of name -> data URL (or null if unavailable)
const iconCache = {};

function appPathFor(name) {
  try {
    const p = execSync(
      `osascript -e 'POSIX path of (path to application "${name.replace(/"/g, '\\"')}")'`,
      { timeout: 3000 }
    ).toString().trim();
    return p || null;
  } catch (e) { return null; }
}

// Find the app's .icns icon file inside its bundle.
function findIcns(appPath) {
  const resDir = path.join(appPath, 'Contents', 'Resources');
  // Prefer the icon named in Info.plist (CFBundleIconFile)
  try {
    let iconFile = execSync(
      `defaults read "${path.join(appPath, 'Contents', 'Info')}" CFBundleIconFile 2>/dev/null`,
      { timeout: 2000 }
    ).toString().trim();
    if (iconFile) {
      if (!iconFile.toLowerCase().endsWith('.icns')) iconFile += '.icns';
      const p = path.join(resDir, iconFile);
      if (fs.existsSync(p)) return p;
    }
  } catch (e) {}
  // Fall back to the first .icns in Resources
  try {
    if (fs.existsSync(resDir)) {
      const f = fs.readdirSync(resDir).find(x => x.toLowerCase().endsWith('.icns'));
      if (f) return path.join(resDir, f);
    }
  } catch (e) {}
  return null;
}

// Convert an app's icon to a 64px PNG data URL using sips (fast, built-in).
// Avoids app.getFileIcon (crashes) and qlmanage (hangs) on this setup.
function getAppIcon(name) {
  if (Object.prototype.hasOwnProperty.call(iconCache, name)) return iconCache[name];

  let result = null;
  const appPath = appPathFor(name);
  if (appPath) {
    try {
      const icns = findIcns(appPath);
      if (icns) {
        const out = path.join(os.tmpdir(), `tbicon_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
        execSync(
          `sips -s format png "${icns.replace(/"/g, '\\"')}" --out "${out}" -Z 64`,
          { timeout: 5000, stdio: 'ignore' }
        );
        if (fs.existsSync(out)) {
          const buf = fs.readFileSync(out);
          result = 'data:image/png;base64,' + buf.toString('base64');
          try { fs.unlinkSync(out); } catch (e) {}
        }
      }
    } catch (e) {
      result = null;
    }
  }

  iconCache[name] = result;
  return result;
}

function barBounds() {
  // Use workArea so the bar sits in the usable screen region (above the Dock),
  // where it is guaranteed to be visible.
  const wa = screen.getPrimaryDisplay().workArea;
  return {
    x: wa.x,
    y: wa.y + wa.height - BAR_HEIGHT,
    width: wa.width,
    height: BAR_HEIGHT,
  };
}

app.whenReady().then(() => {
  win = new BrowserWindow({
    ...barBounds(),
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    backgroundColor: '#d2d2d2',
    alwaysOnTop: true,            // default 'floating' level — renders reliably
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');

  function reposition() { win.setBounds(barBounds()); }
  screen.on('display-metrics-changed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);

  ipcMain.handle('get-apps', () => getRunningApps());
  ipcMain.handle('get-icon', (_, name) => getAppIcon(name));
  ipcMain.on('activate-app', (_, name) => activateApp(name));
  ipcMain.on('quit-app', (_, name) => quitApp(name));
  ipcMain.on('mouse-enter', () => {});
  ipcMain.on('mouse-leave', () => {});
});

app.on('window-all-closed', () => app.quit());
