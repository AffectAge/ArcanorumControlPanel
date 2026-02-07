const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform,
  electronVersion: process.versions.electron,
});
