const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { EventEmitter } = require('events');

class DownloadManager extends EventEmitter {
    constructor() {
        super();
        this.activeDownloads = new Map();
        this.downloadDir = path.join(require('os').tmpdir(), 'mc-installer');
        fs.ensureDirSync(this.downloadDir);
    }

    async download(url, filename, options = {}) {
        const downloadId = Date.now().toString();
        const filepath = path.join(this.downloadDir, filename);

        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                timeout: 60000,
                headers: options.headers || {}
            });

            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloaded = 0;

            const writer = fs.createWriteStream(filepath);

            this.activeDownloads.set(downloadId, { url, filename, filepath, totalSize });

            response.data.on('data', (chunk) => {
                downloaded += chunk.length;
                const progress = totalSize > 0 ? (downloaded / totalSize) * 100 : 0;
                this.emit('progress', { downloadId, filename, downloaded, totalSize, progress });
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    this.activeDownloads.delete(downloadId);
                    this.emit('complete', { downloadId, filename, filepath });
                    resolve(filepath);
                });

                writer.on('error', (err) => {
                    this.activeDownloads.delete(downloadId);
                    fs.removeSync(filepath);
                    this.emit('error', { downloadId, filename, error: err.message });
                    reject(err);
                });
            });
        } catch (error) {
            this.activeDownloads.delete(downloadId);
            this.emit('error', { downloadId, filename, error: error.message });
            throw error;
        }
    }

    async downloadMultiple(items) {
        const promises = items.map(item => this.download(item.url, item.filename, item.options));
        return Promise.all(promises);
    }

    cancel(downloadId) {
        const download = this.activeDownloads.get(downloadId);
        if (download) {
            this.activeDownloads.delete(downloadId);
            fs.removeSync(download.filepath);
            this.emit('cancelled', { downloadId });
        }
    }

    cleanup() {
        fs.removeSync(this.downloadDir);
        fs.ensureDirSync(this.downloadDir);
    }
}

module.exports = DownloadManager;
