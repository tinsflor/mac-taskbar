const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  mouseEnter: () => ipcRenderer.send('mouse-enter'),
  mouseLeave: () => ipcRenderer.send('mouse-leave'),
  getApps: () => ipcRenderer.invoke('get-apps'),
  activateApp: (name) => ipcRenderer.send('activate-app', name),
});
