const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let win;

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
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');

  // transparent areas pass clicks through to other apps
  win.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('mouse-enter', () => win.setIgnoreMouseEvents(false));
  ipcMain.on('mouse-leave', () => win.setIgnoreMouseEvents(true, { forward: true }));
});

app.on('window-all-closed', () => app.quit());
