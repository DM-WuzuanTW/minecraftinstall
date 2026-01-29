const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { execSync } = require('child_process');
const streamPipeline = promisify(pipeline);

class JavaManager {
    constructor(downloadManager) {
        this.downloader = downloadManager;
    }

    getJavaVersion(mcVersion) {
        const [major, minor, patch] = mcVersion.split('.').map(Number);

        if (minor > 20 || (minor === 20 && patch >= 5)) {
            return 21;
        }

        if (minor >= 18) {
            return 17;
        }

        if (minor === 17) {
            return 17;
        }

        return 8;
    }

    getDownloadUrl(javaVersion) {
        return `https://api.adoptium.net/v3/binary/latest/${javaVersion}/ga/windows/x64/jre/hotspot/normal/eclipse`;
    }

    async setupJava(installPath, javaVersion, progressCallback) {
        const runtimeDir = path.join(installPath, '.jre');
        const javaTagFile = path.join(runtimeDir, 'version.txt');

        if (await fs.pathExists(javaTagFile)) {
            const currentVersion = await fs.readFile(javaTagFile, 'utf8');
            if (currentVersion == javaVersion) {
                if (progressCallback) progressCallback('Java 環境已存在，跳過下載', 100);
                return this.getJavaExecutable(installPath);
            }
        }

        await fs.remove(runtimeDir);
        await fs.ensureDir(runtimeDir);

        try {
            execSync(`attrib +h "${runtimeDir}"`);
        } catch (e) { }

        const url = this.getDownloadUrl(javaVersion);
        const zipPath = path.join(installPath, 'java-runtime.zip');

        if (progressCallback) progressCallback(`正在下載 Java ${javaVersion} 環境...`, 0);

        await this.downloadFile(url, zipPath, progressCallback);

        if (progressCallback) progressCallback(`正在解壓縮 Java 環境...`, 90);

        const zip = new AdmZip(zipPath);
        zip.extractAllTo(runtimeDir, true);

        const items = await fs.readdir(runtimeDir);
        let rootDir = runtimeDir;
        if (items.length === 1 && (await fs.stat(path.join(runtimeDir, items[0]))).isDirectory()) {
            rootDir = path.join(runtimeDir, items[0]);
        }

        await fs.writeFile(javaTagFile, javaVersion.toString());

        await fs.remove(zipPath);

        return this.getJavaExecutable(installPath);
    }

    async downloadFile(url, targetPath, progressCallback) {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const totalLength = response.headers['content-length'];
        let downloaded = 0;

        response.data.on('data', (chunk) => {
            downloaded += chunk.length;
            if (progressCallback && totalLength) {
                const percentage = Math.round((downloaded / totalLength) * 90);
                progressCallback(`正在下載 Java 環境... ${percentage}%`, percentage);
            }
        });

        await streamPipeline(response.data, fs.createWriteStream(targetPath));
    }

    async getJavaExecutable(installPath) {
        const runtimeDir = path.join(installPath, '.jre');

        let binDir = path.join(runtimeDir, 'bin');
        if (!await fs.pathExists(binDir)) {
            const items = await fs.readdir(runtimeDir);
            for (const item of items) {
                const checkPath = path.join(runtimeDir, item, 'bin');
                if (await fs.pathExists(checkPath)) {
                    binDir = checkPath;
                    break;
                }
            }
        }

        return path.join(binDir, 'java.exe');
    }
}

module.exports = JavaManager;
