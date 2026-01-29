const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

class UpdateManager {
    constructor(mainWindow) {
        this.window = mainWindow;
        this.setupLogger();
        this.configureUpdater();
        this.attachHandlers();
    }

    setupLogger() {
        autoUpdater.logger = console;
    }

    configureUpdater() {
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
    }

    attachHandlers() {
        autoUpdater.on('checking-for-update', () => {
            this.sendStatus('checking-for-update');
        });

        autoUpdater.on('update-available', (info) => {
            this.sendStatus('update-available', info);
            this.promptDownload(info);
        });

        autoUpdater.on('update-not-available', () => {
            this.sendStatus('update-not-available');
        });

        autoUpdater.on('error', (err) => {
            console.error('Update error:', err);
            this.sendStatus('error', { message: err.message });
        });

        autoUpdater.on('download-progress', (progress) => {
            this.sendStatus('download-progress', progress);
        });

        autoUpdater.on('update-downloaded', (info) => {
            this.sendStatus('update-downloaded', info);
            this.promptInstall();
        });
    }

    sendStatus(type, data = null) {
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('update-status', { type, data });
        }
    }

    promptDownload(info) {
        const version = info.version;
        dialog.showMessageBox(this.window, {
            type: 'info',
            title: 'Update Available',
            message: `A new version (${version}) is available. Download now?`,
            buttons: ['Download', 'Later']
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    }

    promptInstall() {
        dialog.showMessageBox(this.window, {
            type: 'info',
            title: 'Update Ready',
            message: 'Update has been downloaded. Restart to install?',
            buttons: ['Restart Now', 'Later']
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall(false, true);
            }
        });
    }

    check() {
        if (!require('electron').app.isPackaged) {
            console.log('Skipping update check in dev mode');
            this.sendStatus('error', { message: '開發模式無法檢查更新 (Dev Mode)' });
            return;
        }
        try {
            autoUpdater.checkForUpdates();
        } catch (error) {
            console.error('Failed to check for updates:', error);
            this.sendStatus('error', { message: '無法檢查更新: ' + error.message });
        }
    }
}

module.exports = UpdateManager;
