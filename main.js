const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { execSync } = require('child_process');
const path = require('path');

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

// Cache of name -> data URL (or null if unavailable)
const iconCache = {};

async function getAppIcon(name) {
  if (Object.prototype.hasOwnProperty.call(iconCache, name)) return iconCache[name];
  try {
    const appPath = execSync(
      `osascript -e 'POSIX path of (path to application "${name.replace(/"/g, '\\"')}")'`,
      { timeout: 3000 }
    ).toString().trim();
    if (appPath) {
      const img = await app.getFileIcon(appPath, { size: 'large' });
      const dataUrl = img && !img.isEmpty() ? img.toDataURL() : null;
      iconCache[name] = dataUrl;
      return dataUrl;
    }
  } catch (e) {}
  iconCache[name] = null;
  return null;
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
  ipcMain.on('mouse-enter', () => {});
  ipcMain.on('mouse-leave', () => {});
});

app.on('window-all-closed', () => app.quit());
