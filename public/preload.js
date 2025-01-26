const { ipcRenderer, contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  sendToMain: (channel, data) => {
    const validChannels = ['notification-intercepted'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
});