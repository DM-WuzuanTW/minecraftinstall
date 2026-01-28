const fs = require('fs-extra');
const path = require('path');
const AdmZip = require('adm-zip');
const { spawn } = require('child_process');

class ServerInstaller {
    constructor(downloadManager, apiClient) {
        this.downloader = downloadManager;
        this.api = apiClient;
    }

    async install(config) {
        const { serverType, version, installPath, options = {} } = config;

        try {
            await fs.ensureDir(installPath);

            const downloadUrl = await this.getDownloadUrl(serverType, version);
            const filename = this.getFilename(serverType, version);

            const jarPath = await this.downloader.download(downloadUrl, filename);
            const targetPath = path.join(installPath, 'server.jar');

            await fs.move(jarPath, targetPath, { overwrite: true });

            if (options.acceptEula) {
                await this.createEulaFile(installPath);
            }

            if (options.createStartScript) {
                await this.createStartScript(installPath, options.memory || 4096, options.gui || false);
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
        const lowerType = type.toLowerCase();

        if (lowerType === 'paper') {
            const builds = await this.api.getPaperBuilds('paper', version);
            const latestBuild = builds[0];
            return `https://api.papermc.io/v2/projects/paper/versions/${version}/builds/${latestBuild}/downloads/paper-${version}-${latestBuild}.jar`;
        }

        if (lowerType === 'fabric') {
            const loaders = await this.api.getFabricLoaders();
            const loader = loaders[0];
            return `https://meta.fabricmc.net/v2/versions/loader/${version}/${loader}/1.0.0/server/jar`;
        }

        if (lowerType === 'vanilla') {
            const versions = await this.api.getVanillaVersions();
            const versionData = versions.find(v => v.id === version);
            const manifest = await this.api._fetch(versionData.url);
            return manifest.downloads.server.url;
        }

        throw new Error(`Unsupported server type: ${type}`);
    }

    getFilename(type, version) {
        return `${type.toLowerCase()}-${version}.jar`;
    }

    async createEulaFile(dir) {
        const eulaPath = path.join(dir, 'eula.txt');
        const content = `eula=true\n`;
        await fs.writeFile(eulaPath, content, 'utf8');
    }

    async createStartScript(dir, memoryMB, gui) {
        const scriptPath = path.join(dir, 'start.bat');
        const guiFlag = gui ? '' : 'nogui';
        const content = `@echo off
java -Xms${memoryMB}M -Xmx${memoryMB}M -jar server.jar ${guiFlag}
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

    async checkJava() {
        return new Promise((resolve) => {
            const java = spawn('java', ['-version']);
            java.on('error', () => resolve(false));
            java.on('close', (code) => resolve(code === 0));
        });
    }
}

module.exports = ServerInstaller;
