const { app, BrowserWindow, ipcMain, shell, Tray, Menu } = require("electron");
const path = require("path");

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 220,
    minWidth: 280,
    minHeight: 200,
    maxWidth: 400,
    maxHeight: 300,
    icon: path.join(__dirname, "images/wemix-512x512.png"),
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile("index.html");

  // Intercept the close event.
  mainWindow.on("close", (event) => {
    // If we are not explicitly quitting, prevent the window from closing.
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide(); // Hide the window instead.
    }
    // If app.isQuitting is true, the default close action is allowed.
  });

  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  // Create the tray icon
  tray = new Tray(path.join(__dirname, "images/wemix-192x192.png"));

  // Create the context menu for the tray
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show Widget", click: () => mainWindow.show() },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true; // Set a flag to indicate we are really quitting
        app.quit();
      },
    },
  ]);

  tray.setToolTip("WEMIX Price Widget");
  tray.setContextMenu(contextMenu);

  // Show/hide the window when the tray icon is clicked
  tray.on("click", () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// --- IPC HANDLERS ---
ipcMain.on("close-app", () => {
  // When the UI 'close' button is clicked, hide the window to the tray.
  // The actual quit is handled by the tray context menu.
  mainWindow.hide();
});

ipcMain.on("set-always-on-top", (event, flag) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  window.setAlwaysOnTop(flag);
});

ipcMain.on("open-external-link", (event, url) => {
  shell.openExternal(url);
});
