const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  mouseEnter: () => ipcRenderer.send('mouse-enter'),
  mouseLeave: () => ipcRenderer.send('mouse-leave'),
  getApps: () => ipcRenderer.invoke('get-apps'),
  getIcon: (name) => ipcRenderer.invoke('get-icon', name),
  activateApp: (name) => ipcRenderer.send('activate-app', name),
  quitApp: (name) => ipcRenderer.send('quit-app', name),
  showAppMenu: (info) => ipcRenderer.send('show-app-menu', info),
  onMenuUnpin: (cb) => ipcRenderer.on('menu-unpin', (_, name) => cb(name)),
  onMenuPin: (cb) => ipcRenderer.on('menu-pin', (_, name) => cb(name)),
  onRefresh: (cb) => ipcRenderer.on('refresh', () => cb()),
  licenseStatus: () => ipcRenderer.invoke('license:status'),
  licenseActivate: (key) => ipcRenderer.invoke('license:activate', key),
  licenseBuy: () => ipcRenderer.send('license:buy'),
  licenseOpen: () => ipcRenderer.send('license:open'),
});
