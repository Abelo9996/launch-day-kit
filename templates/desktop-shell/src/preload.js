const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agent', {
  start: (size) => ipcRenderer.invoke('pty:start', size),
  input: (data) => ipcRenderer.send('pty:input', data),
  resize: (size) => ipcRenderer.send('pty:resize', size),
  openConfig: () => ipcRenderer.send('config:open'),
  smokeSeen: () => ipcRenderer.send('smoke:seen'),
  onData: (fn) => ipcRenderer.on('pty:data', (_e, d) => fn(d)),
  onExit: (fn) => ipcRenderer.on('pty:exit', (_e, code) => fn(code)),
  onRestart: (fn) => ipcRenderer.on('pty:restart', () => fn()),
});
