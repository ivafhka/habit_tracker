// Мост между страницей и Electron. Наружу отдаётся только минимум.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    isElectron: true,
    getServerUrl: () => ipcRenderer.invoke("habit:get-server-url"),
    setServerUrl: (url) => ipcRenderer.invoke("habit:set-server-url", url),
    retry: () => ipcRenderer.invoke("habit:retry")
});
