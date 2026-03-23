const { contextBridge, ipcRenderer } = require("electron");

// Expose a safe bridge for Lucy to send nudge notifications to the desktop OS
contextBridge.exposeInMainWorld("lucyDesktop", {
  isDesktop: true,

  // Called by Lucy's web app to fire a system notification for a nudge
  sendNudge: (title, body) => {
    ipcRenderer.send("lucy:nudge", { title, body });
  },
});
