const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  mouseEnter: () => ipcRenderer.send('mouse-enter'),
  mouseLeave: () => ipcRenderer.send('mouse-leave'),
  getApps: () => ipcRenderer.invoke('get-apps'),
  getIcon: (name) => ipcRenderer.invoke('get-icon', name),
  activateApp: (name) => ipcRenderer.send('activate-app', name),
  quitApp: (name) => ipcRenderer.send('quit-app', name),
});
