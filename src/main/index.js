const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const UpdateManager = require('./updater');
const DownloadManager = require('./downloader');
const ServerInstaller = require('./installer');
const MinecraftAPI = require('../api/MinecraftAPI');

let mainWindow;
let updateManager;
let downloadManager;
let installer;
let api;

const isDev = process.argv.includes('--dev');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 680,
        height: 720,
        minWidth: 680,
        minHeight: 720,
        resizable: true,
        maximizable: false,
        frame: true,
        backgroundColor: '#0f172a',
        icon: path.join(__dirname, '../../assets/icon.png'),
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        if (!isDev) {
            setTimeout(() => {
                updateManager.check();
            }, 3000);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

function initializeServices() {
    api = new MinecraftAPI();
    downloadManager = new DownloadManager();
    installer = new ServerInstaller(downloadManager, api);

    downloadManager.on('progress', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', data);
        }
    });

    downloadManager.on('complete', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-complete', data);
        }
    });

    downloadManager.on('error', (data) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-error', data);
        }
    });
}

app.whenReady().then(() => {
    initializeServices();
    createWindow();

    if (!isDev) {
        updateManager = new UpdateManager(mainWindow);
    }

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

app.on('before-quit', () => {
    if (downloadManager) {
        downloadManager.cleanup();
    }
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Installation Directory'
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('get-versions', async (event, serverType) => {
    try {
        const type = serverType.toLowerCase();
        let versions = [];

        if (type.includes('paper')) {
            versions = await api.getPaperVersions();
        } else if (type.includes('fabric')) {
            versions = await api.getFabricVersions();
        } else if (type.includes('vanilla')) {
            const data = await api.getVanillaVersions();
            versions = data.map(v => v.id);
        } else if (type.includes('forge')) {
            const promos = await api.getForgeVersions();
            versions = Object.keys(promos).filter(k => k.includes('recommended')).map(k => k.replace('-recommended', ''));
        } else if (type.includes('purpur')) {
            versions = await api.getPurpurVersions();
        }

        return versions.length > 0 ? versions : ['1.20.4', '1.20.2', '1.20.1', '1.19.4'];
    } catch (error) {
        return ['1.20.4', '1.20.2', '1.20.1', '1.19.4'];
    }
});

ipcMain.handle('start-installation', async (event, config) => {
    try {
        // Pass sender to allow sending progress updates
        const result = await installer.install(config, (status, progress) => {
            event.sender.send('installation-progress', {
                message: status,
                percent: progress
            });
        });
        return { success: true, ...result };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('check-updates', async () => {
    if (updateManager) {
        updateManager.check();
    }
    return true;
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});
