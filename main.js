const { app, BrowserWindow, screen, ipcMain } = require('electron');
const { execSync } = require('child_process');
const path = require('path');

let win;
const BAR_HEIGHT = 37;

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
    const skip = ['Taskbar', 'Electron'];
    return [...new Set(names)].filter(n => !skip.includes(n));
  } catch (e) {}

  return [];
}

function activateApp(name) {
  try {
    execSync(`osascript -e 'tell application "${name}" to activate'`, { timeout: 2000 });
  } catch (e) {}
}

app.whenReady().then(() => {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.bounds;

  win = new BrowserWindow({
    width,
    height: 200,
    x: 100,
    y: Math.floor(height / 2) - 100,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    fullscreenable: false,
    backgroundColor: '#ff0000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // keep it pinned to the bottom even if the screen resolution changes
  function reposition() {
    const d = screen.getPrimaryDisplay().bounds;
    win.setBounds({ x: 0, y: d.height - BAR_HEIGHT, width: d.width, height: BAR_HEIGHT });
  }
  screen.on('display-metrics-changed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);

  ipcMain.handle('get-apps', () => getRunningApps());
  ipcMain.on('activate-app', (_, name) => activateApp(name));

  // No-op handlers kept so the renderer's guarded calls never error
  ipcMain.on('mouse-enter', () => {});
  ipcMain.on('mouse-leave', () => {});
});

app.on('window-all-closed', () => app.quit());
