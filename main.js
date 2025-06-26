const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 320,
    height: 220, // Increased height
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Best practice
      contextIsolation: true, // Best practice
    }
  });

  mainWindow.loadFile('index.html');

  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC HANDLERS ---
ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('set-always-on-top', (event, flag) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window.setAlwaysOnTop(flag);
});

ipcMain.on('open-external-link', (event, url) => {
  shell.openExternal(url);
});
