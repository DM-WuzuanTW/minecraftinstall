const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

class JavaManager {
    constructor(downloadManager) {
        this.downloader = downloadManager;
    }

    /**
     * Determine required Java version based on Minecraft version
     * @param {string} mcVersion 
     */
    getJavaVersion(mcVersion) {
        const [major, minor, patch] = mcVersion.split('.').map(Number);

        // MC 1.20.5+ requires Java 21
        if (minor > 20 || (minor === 20 && patch >= 5)) {
            return 21;
        }

        // MC 1.18 - 1.20.4 requires Java 17
        if (minor >= 18) {
            return 17;
        }

        // MC 1.17 requires Java 16 (Java 17 works)
        if (minor === 17) {
            return 17;
        }

        // Older versions usually run on Java 8
        return 8;
    }

    /**
     * Get download URL for specific major Java version (Windows x64 JRE)
     * @param {number} javaVersion 
     */
    getDownloadUrl(javaVersion) {
        // Using Eclipse Adoptium API for latest LTS release
        return `https://api.adoptium.net/v3/binary/latest/${javaVersion}/ga/windows/x64/jre/hotspot/normal/eclipse`;
    }

    /**
     * Download and extract Java Runtime
     * @param {string} installPath Target directory for server
     * @param {number} javaVersion Java major version
     * @param {function} progressCallback Callback for progress updates
     */
    async setupJava(installPath, javaVersion, progressCallback) {
        const runtimeDir = path.join(installPath, 'runtime');
        const javaTagFile = path.join(runtimeDir, 'version.txt');

        // Check if correct Java version is already installed
        if (await fs.pathExists(javaTagFile)) {
            const currentVersion = await fs.readFile(javaTagFile, 'utf8');
            if (currentVersion == javaVersion) {
                if (progressCallback) progressCallback('Java 環境已存在，跳過下載', 100);
                return this.getJavaExecutable(installPath);
            }
        }

        // Clean up old runtime
        await fs.remove(runtimeDir);
        await fs.ensureDir(runtimeDir);

        const url = this.getDownloadUrl(javaVersion);
        const zipPath = path.join(installPath, 'java-runtime.zip');

        if (progressCallback) progressCallback(`正在下載 Java ${javaVersion} 環境...`, 0);

        // Download ZIP
        await this.downloadFile(url, zipPath, progressCallback);

        if (progressCallback) progressCallback(`正在解壓縮 Java 環境...`, 90);

        // Extract ZIP
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(runtimeDir, true);

        // Adoptium zips usually contain a root folder like 'jdk-17.0.x..'
        // We want to flatten this so 'bin' is directly under a known folder or handle it dynamically
        // Let's find the 'bin' folder
        const items = await fs.readdir(runtimeDir);
        let rootDir = runtimeDir;
        if (items.length === 1 && (await fs.stat(path.join(runtimeDir, items[0]))).isDirectory()) {
            rootDir = path.join(runtimeDir, items[0]);
            // Move contents up one level for cleaner structure (optional, but easier for fixed paths)
            // For safety, we will just detect the path dynamically in getJavaExecutable
        }

        // Save version tag
        await fs.writeFile(javaTagFile, javaVersion.toString());

        // Cleanup zip
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
                // Map download progress from 0-90% of total step
                const percentage = Math.round((downloaded / totalLength) * 90);
                progressCallback(`正在下載 Java 環境... ${percentage}%`, percentage);
            }
        });

        await streamPipeline(response.data, fs.createWriteStream(targetPath));
    }

    /**
     * Get path to java.exe
     */
    async getJavaExecutable(installPath) {
        const runtimeDir = path.join(installPath, 'runtime');

        // Find bin directory recursively (depth 1)
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
