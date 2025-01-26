const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  Tray,
  Menu,
  systemPreferences,
} = require("electron");
const path = require("path");
const { Notification } = require("electron");

let mainWindow;
let tray = null;
let isQuiting = false;
let isVisible = true;
const dev = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 840,
    minHeight: 400,
    minWidth: 400,
    frame: true,
    title: "Google Chat",
    webPreferences: {
      webSecurity: false,
      preload: path.join(__dirname, "/preload.js"),
      devTools: true,
      nodeIntegration: true,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // This is to handle the notifications in the main process
  // I don't have access to google code hehe xd
  mainWindow.webContents.on("did-navigate", hijackNotification);
  mainWindow.webContents.once("dom-ready", hijackNotification);

  function hijackNotification() {
    mainWindow.webContents.executeJavaScript(`
      const OriginalNotification = window.Notification;
  
      class CustomNotification extends OriginalNotification {
        constructor(title, options) {
          if (window.electron && window.electron.sendToMain) {
            window.electron.sendToMain('notification-intercepted', {
              title,
              options,
            });
          }
        }
      }
  
      window.Notification = CustomNotification;
  
      console.log('Custom Notification API injected successfully!');
    `);
  }
  if (dev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.removeMenu();
  const windowURL = "https://mail.google.com/chat/u/0/#chat/home";

  mainWindow.loadURL(windowURL);

  mainWindow.on("minimize", function (event) {
    closeApp(event);
  });

  mainWindow.on("close", function (event) {
    if (!isQuiting) {
      closeApp(event);
    }
    return false;
  });
  mainWindow.on("focus", function (event) {
    mainWindow.setOverlayIcon(null, "");
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("Google Chat");
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

ipcMain.on("notification-intercepted", (event, notification) => {
  if (!isVisible) {
    new Notification({
      title: notification.title,
      body: notification.options.body,
      silent: true,
    }).show();
  }
  if (!mainWindow.isFocused()) {
    mainWindow.setOverlayIcon(
      path.join(__dirname, "notification.png"),
      "The app has a notification"
    );
  }
});

function createTray() {
  appTray = new Tray(path.join(__dirname, "favicon.ico"));

  appTray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show App",
        click: function () {
          openApp();
        },
      },
      {
        label: "Quit",
        click: function () {
          isQuiting = true;
          app.quit();
        },
      },
    ])
  );
  appTray.on("double-click", function (event) {
    openApp();
  });
  appTray.setToolTip("Google Chat");
  return appTray;
}

function openApp() {
  isVisible = true;
  mainWindow.show();
  tray.destroy();
}

function closeApp(event) {
  event.preventDefault();
  mainWindow.hide();
  isVisible = false;
  tray = createTray();
}
