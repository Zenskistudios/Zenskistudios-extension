const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zenskiSettings', {
  get: () => ipcRenderer.invoke('settings-get'),
  save: (s) => ipcRenderer.invoke('settings-save', s),
  toggleWatch: () => ipcRenderer.invoke('watch-toggle'),
  watchState: () => ipcRenderer.invoke('watch-state'),
  preview: () => ipcRenderer.invoke('trigger-preview')
});
