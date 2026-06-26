const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { execSync } = require('child_process');
const path = require('path');

let win;

function getRunningApps() {
  // Try osascript (requires Automation permission for System Events)
  try {
    const result = execSync(
      `osascript -e 'tell application "System Events" to get name of every process whose background only is false'`,
      { timeout: 3000 }
    ).toString().trim();
    if (result) return result.split(', ').filter(n => n && n !== 'Taskbar' && n !== 'Electron');
  } catch (e) {}

  // Fallback: lsappinfo (no special permission needed)
  try {
    const result = execSync('lsappinfo list -only name 2>/dev/null', { timeout: 3000 }).toString();
    const names = [];
    result.split('\n').forEach(line => {
      const match = line.match(/name="([^"]+)"/);
      if (match && match[1] && !['Taskbar','Electron','Dock','SystemUIServer','WindowServer'].includes(match[1])) {
        names.push(match[1]);
      }
    });
    return [...new Set(names)];
  } catch (e) {}

  return [];
}

function activateApp(name) {
  try {
    execSync(`osascript -e 'tell application "${name}" to activate'`, { timeout: 2000 });
  } catch (e) {}
}

app.whenReady().then(() => {
  const { width, height } = screen.getPrimaryDisplay().bounds;

  win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('mouse-enter', () => win.setIgnoreMouseEvents(false));
  ipcMain.on('mouse-leave', () => win.setIgnoreMouseEvents(true, { forward: true }));
  ipcMain.handle('get-apps', () => getRunningApps());
  ipcMain.on('activate-app', (_, name) => activateApp(name));
});

app.on('window-all-closed', () => app.quit());
