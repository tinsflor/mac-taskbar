const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

let win;

app.whenReady().then(() => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width,
    height: height + 48,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadFile('index.html');
});

app.on('window-all-closed', () => app.quit());
