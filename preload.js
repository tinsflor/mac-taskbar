const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  mouseEnter: () => ipcRenderer.send('mouse-enter'),
  mouseLeave: () => ipcRenderer.send('mouse-leave'),
});
