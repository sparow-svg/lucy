const { app, BrowserWindow, Notification, ipcMain, nativeTheme, shell } = require("electron");
const path = require("path");

// ── Configuration ─────────────────────────────────────────────────────────────
// In production, point to your deployed Lucy URL.
// In development, the local dev server URL is used.
const LUCY_URL = process.env.LUCY_URL || "https://your-replit-app.replit.app/";
const DEV_URL  = process.env.LUCY_DEV_URL || "http://localhost:5173/";
const isDev    = process.env.NODE_ENV === "development" || !app.isPackaged;

let mainWindow = null;

// ── Create main window ────────────────────────────────────────────────────────
function createWindow() {
  nativeTheme.themeSource = "dark";

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: "hiddenInset",  // macOS native look
    backgroundColor: "#0a0a0a",
    vibrancy: "under-window",       // macOS frosted glass effect
    visualEffectState: "active",
    icon: path.join(__dirname, "../assets/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow microphone access (required for voice)
      webSecurity: true,
    },
    show: false,
  });

  // Load Lucy
  const targetUrl = isDev ? DEV_URL : LUCY_URL;
  mainWindow.loadURL(targetUrl);

  // Show once ready to avoid blank flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  // Open external links in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();

  // macOS: re-create window on dock click
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── Nudge notifications ───────────────────────────────────────────────────────
// Lucy's web app sends nudges via postMessage → preload → ipcRenderer → here
ipcMain.on("lucy:nudge", (_event, { title, body }) => {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: title || "Lucy",
    body: body || "You have a nudge from Lucy.",
    icon: path.join(__dirname, "../assets/icon.png"),
    silent: false,
  });

  notification.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  notification.show();
});

// ── Microphone permission ─────────────────────────────────────────────────────
app.on("web-contents-created", (_event, contents) => {
  contents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === "media") {
      callback(true); // Allow microphone for voice
    } else {
      callback(false);
    }
  });
});
