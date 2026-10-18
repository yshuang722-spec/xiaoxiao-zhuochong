const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('petClient', Object.freeze({
  list: () => ipcRenderer.invoke('characters:list'),
  toggle: (id, visible) => ipcRenderer.invoke('characters:toggle', id, visible),
  play: (id, name) => ipcRenderer.invoke('characters:play', id, name),
  folder: (id) => ipcRenderer.invoke('characters:folder', id),
  import: () => ipcRenderer.invoke('characters:import'),
  hideAll: () => ipcRenderer.invoke('characters:hide-all'),
  showAll: () => ipcRenderer.invoke('characters:show-all'),
  quit: () => ipcRenderer.invoke('client:quit'),
  onChanged: (callback) => {const listener=(_event,roles)=>callback(roles);ipcRenderer.on('characters:changed',listener);return ()=>ipcRenderer.removeListener('characters:changed',listener);},
}));
