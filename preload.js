const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  send: (channel, data) => {
    // Whitelist channels
    let validChannels = [
      "set-always-on-top",
      "open-external-link",
      "close-app",
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
});
