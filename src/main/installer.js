const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');
const JavaManager = require('./java_manager');

class ServerInstaller {
    constructor(downloadManager, apiClient) {
        this.downloader = downloadManager;
        this.api = apiClient;
        this.javaManager = new JavaManager(downloadManager);
    }

    async install(config, progressCallback) {
        const { serverType, version, installPath, options = {} } = config;

        // Callback for progress updates
        const updateProgress = (msg, percent) => {
            // This assumes the caller might attach a listener, or we handle it via IPC in the main process
            // Currently, the caller `main/index.js` or renderer expects simple return or error
            // Ideally we should emit events, but for now we follow the existing pattern
            // and maybe just log it. The UI update is handled by the caller polling or us sending IPC.
            // We can check if `this.window` is available or pass a callback in config.
            if (progressCallback) {
                progressCallback(msg, percent);
            }
        };

        try {
            await fs.ensureDir(installPath);

            // 1. Setup Java
            const javaVersion = this.javaManager.getJavaVersion(version);
            // We need to send progress updates to UI. Since we don't have direct access to window here easily unless passed,
            // we will skip fine-grained progress for now or rely on the main process to handle it.
            // *Wait*, better to let the main process handle the UI updates.
            // For now, let's just run it. 
            // In a real scenario, we should pass `event.sender` or similar to send progress.

            // Let's assume we want to auto-install Java if requested
            let javaPath = 'java'; // Default system java
            if (options.autoJava !== false) { // Default to true
                // Note: We need a way to report progress back to UI
                javaPath = await this.javaManager.setupJava(installPath, javaVersion, updateProgress);
            }

            // 2. Download Server Jar
            const downloadUrl = await this.getDownloadUrl(serverType, version);
            const filename = this.getFilename(serverType, version);
            const jarPath = await this.downloader.download(downloadUrl, filename);
            const targetPath = path.join(installPath, 'server.jar');
            await fs.move(jarPath, targetPath, { overwrite: true });

            // 3. Setup Files
            if (options.acceptEula) {
                await this.createEulaFile(installPath);
            }

            if (options.createStartScript) {
                // Use relative path for portability if java is inside runtime
                let scriptJavaPath = 'java';
                if (javaPath.includes(installPath)) {
                    // Make it relative: "runtime\bin\java.exe"
                    scriptJavaPath = path.relative(installPath, javaPath);
                }

                await this.createStartScript(installPath, options.memory || 4096, options.gui || false, scriptJavaPath);
            }

            if (options.serverProperties) {
                await this.createServerProperties(installPath, options.serverProperties);
            }

            return { success: true, path: installPath, jar: targetPath };
        } catch (error) {
            throw new Error(`Installation failed: ${error.message}`);
        }
    }

    async getDownloadUrl(type, version) {
        const url = await this.api.getDownloadUrl(type, version);
        if (!url) {
            throw new Error(`無法取得下載連結 (類型: ${type}, 版本: ${version})。如果是 Forge，目前尚未支援自動下載。`);
        }
        return url;
    }

    getFilename(type, version) {
        return `${type.toLowerCase()}-${version}.jar`;
    }

    async createEulaFile(dir) {
        const eulaPath = path.join(dir, 'eula.txt');
        const content = `eula=true\n`;
        await fs.writeFile(eulaPath, content, 'utf8');
    }

    async createStartScript(dir, memoryMB, gui, javaCommand = 'java') {
        const scriptPath = path.join(dir, 'start.bat');
        const guiFlag = gui ? '' : 'nogui';

        // Ensure we quote the java command in case of spaces, but relative paths usually don't have spaces if 'runtime'
        // But safe to quote.
        const content = `@echo off
"${javaCommand}" -Xms${memoryMB}M -Xmx${memoryMB}M -jar server.jar ${guiFlag}
pause
`;
        await fs.writeFile(scriptPath, content, 'utf8');
    }

    async createServerProperties(dir, props) {
        const propertiesPath = path.join(dir, 'server.properties');
        let content = '';

        for (const [key, value] of Object.entries(props)) {
            content += `${key}=${value}\n`;
        }

        await fs.writeFile(propertiesPath, content, 'utf8');
    }
}

module.exports = ServerInstaller;
