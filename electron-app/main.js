// Electron-оболочка для Habit Tracker.
// Окно открывает сайт с вашего ASP.NET-сервера в «телефонном» окне.
// Сервер (API + статика из wwwroot + PostgreSQL) запускается отдельно.

const { app, BrowserWindow, ipcMain, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

// Адрес по умолчанию — профиль "http" из launchSettings.json (без проблем с сертификатом).
const DEFAULT_SERVER_URL = "http://localhost:5288";

// Размер окна как у современного телефона.
const WINDOW = { width: 412, height: 820, minWidth: 360, minHeight: 600 };

let mainWindow = null;

// ---------- Настройки (адрес сервера) ----------

function configPath() {
    return path.join(app.getPath("userData"), "config.json");
}

function readConfig() {
    try {
        return JSON.parse(fs.readFileSync(configPath(), "utf8"));
    } catch {
        return {};
    }
}

function writeConfig(config) {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(config, null, 2));
}

// Возвращает origin (схема + хост + порт) или null, если адрес некорректен.
function normalizeServerUrl(value) {
    try {
        const url = new URL(String(value).trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return url.origin;
    } catch {
        return null;
    }
}

// Приоритет: переменная окружения -> сохранённая настройка -> значение по умолчанию.
function getServerUrl() {
    return (
        normalizeServerUrl(process.env.HABIT_SERVER_URL || "") ||
        normalizeServerUrl(readConfig().serverUrl || "") ||
        DEFAULT_SERVER_URL
    );
}

// ---------- Окно ----------

function loadApp() {
    if (!mainWindow) return;
    mainWindow.loadURL(getServerUrl() + "/index.html");
}

function showOfflinePage(failedUrl, description) {
    if (!mainWindow) return;
    mainWindow.loadFile(path.join(__dirname, "offline.html"), {
        query: { url: failedUrl, reason: description || "" }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        ...WINDOW,
        title: "Habit Tracker",
        backgroundColor: "#f7f3ee",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    const wc = mainWindow.webContents;

    // Как в телефоне: без масштабирования щипком.
    wc.setVisualZoomLevelLimits(1, 1);

    // Ссылки на чужие сайты открываем в обычном браузере, а не в приложении.
    const serverOrigin = () => new URL(getServerUrl()).origin;
    const isExternal = (url) => {
        try {
            const parsed = new URL(url);
            if (parsed.protocol === "file:") return false;
            return parsed.origin !== serverOrigin();
        } catch {
            return true;
        }
    };

    wc.setWindowOpenHandler(({ url }) => {
        if (/^https?:/i.test(url)) shell.openExternal(url);
        return { action: "deny" };
    });

    wc.on("will-navigate", (event, url) => {
        if (isExternal(url)) {
            event.preventDefault();
            if (/^https?:/i.test(url)) shell.openExternal(url);
        }
    });

    // Сервер не запущен / нет сети -> понятная страница вместо белого экрана.
    wc.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return;
        if (errorCode === -3) return; // ERR_ABORTED: навигацию прервали сами
        if (validatedURL.startsWith("file:")) return;
        showOfflinePage(getServerUrl(), errorDescription);
    });

    // Для разработки: F12 открывает DevTools (в собранной версии отключено).
    if (!app.isPackaged) {
        wc.on("before-input-event", (event, input) => {
            if (input.type === "keyDown" && input.key === "F12") {
                wc.toggleDevTools();
                event.preventDefault();
            }
        });
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    loadApp();
}

// ---------- IPC (нужен только странице offline.html) ----------

// Менять адрес сервера можно только со страницы самого приложения, не с сайта.
function isTrustedSender(event) {
    const url = event.senderFrame && event.senderFrame.url;
    return typeof url === "string" && url.startsWith("file:");
}

ipcMain.handle("habit:get-server-url", () => getServerUrl());

ipcMain.handle("habit:set-server-url", (event, value) => {
    if (!isTrustedSender(event)) return { ok: false, error: "Недоступно" };

    const normalized = normalizeServerUrl(value);
    if (!normalized) {
        return { ok: false, error: "Введите адрес вида http://localhost:5288 или https://example.com" };
    }

    writeConfig({ ...readConfig(), serverUrl: normalized });
    loadApp();
    return { ok: true };
});

ipcMain.handle("habit:retry", (event) => {
    if (!isTrustedSender(event)) return;
    loadApp();
});

// ---------- Жизненный цикл ----------

// Только один экземпляр приложения.
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    app.on("second-instance", () => {
        if (!mainWindow) return;
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    });

    app.whenReady().then(() => {
        // На Windows/Linux меню не нужно. На macOS оставляем: там через него работают Ctrl/Cmd+C/V.
        if (process.platform !== "darwin") Menu.setApplicationMenu(null);
        createWindow();

        app.on("activate", () => {
            if (BrowserWindow.getAllWindows().length === 0) createWindow();
        });
    });

    app.on("window-all-closed", () => {
        if (process.platform !== "darwin") app.quit();
    });
}
