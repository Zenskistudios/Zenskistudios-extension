const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zenski', {
  requestResume: () => ipcRenderer.send('resume-requested'),
  requestPreviewClose: () => ipcRenderer.send('preview-close-requested')
});
