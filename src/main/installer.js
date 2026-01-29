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

        const updateProgress = (msg, percent) => {
            if (progressCallback) {
                progressCallback(msg, percent);
            }
        };

        try {
            await fs.ensureDir(installPath);

            const javaVersion = this.javaManager.getJavaVersion(version);

            let javaPath = 'java';
            if (options.autoJava !== false) {
                javaPath = await this.javaManager.setupJava(installPath, javaVersion, updateProgress);
            }

            const downloadUrl = await this.getDownloadUrl(serverType, version);
            const filename = this.getFilename(serverType, version);
            const jarPath = await this.downloader.download(downloadUrl, filename);

            let targetJarName = 'server.jar';
            if (serverType.toLowerCase() === 'forge') {
                targetJarName = 'forge-installer.jar';
            }

            const targetPath = path.join(installPath, targetJarName);
            await fs.move(jarPath, targetPath, { overwrite: true });

            if (serverType.toLowerCase() === 'forge') {
                updateProgress('正在執行 Forge 安裝程序... (這可能需要幾分鐘)', 95);
                await this.installForge(installPath, javaPath, targetJarName, updateProgress);
            }

            if (options.acceptEula) {
                await this.createEulaFile(installPath);
            }

            if (options.createStartScript) {
                let scriptJavaPath = 'java';
                if (javaPath.includes(installPath)) {
                    scriptJavaPath = path.relative(installPath, javaPath);
                }

                if (serverType.toLowerCase() === 'forge') {
                    await this.createForgeStartScript(installPath, options.memory || 4096, options.gui || false, scriptJavaPath);
                } else {
                    await this.createStartScript(installPath, options.memory || 4096, options.gui || false, scriptJavaPath);
                }
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

    async installForge(dir, javaPath, installerName, updateProgress) {
        return new Promise((resolve, reject) => {
            console.log('Running Forge Installer:', javaPath, installerName);
            const process = spawn(javaPath, ['-jar', installerName, '--installServer'], {
                cwd: dir,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            process.stdout.on('data', (data) => {
                const line = data.toString();
                if (updateProgress) {
                    if (line.includes('Downloading')) {
                        updateProgress('正在下載 Forge 函式庫... (這取決於您的網路速度)', 96);
                    } else if (line.includes('Processing')) {
                        updateProgress('正在處理 Forge 檔案...', 98);
                    }
                }
            });

            process.stderr.on('data', (data) => {
                const msg = data.toString();
                if (!msg.includes('SLF4J') && !msg.includes('Consider reporting this')) {
                    console.error('Forge stderr:', msg);
                }
            });

            process.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Forge Installer failed with code ' + code));
            });
            process.on('error', (err) => reject(err));
        });
    }

    async createForgeStartScript(installPath, memory, gui, javaPath) {
        const runBatPath = path.join(installPath, 'run.bat');
        const runShPath = path.join(installPath, 'run.sh');

        const argsContent = `-Xms1024M
-Xmx${memory}M
`;
        await fs.writeFile(path.join(installPath, 'user_jvm_args.txt'), argsContent);

        if (await fs.pathExists(runBatPath) || await fs.pathExists(runShPath)) {
            let argsFile = '';
            try {
                const runBatContent = await fs.readFile(runBatPath, 'utf8');
                const match = runBatContent.match(/@(libraries.+win_args\.txt)/);
                if (match) {
                    argsFile = match[1];
                }
            } catch (e) {
                console.warn('Failed to parse run.bat:', e);
            }

            if (argsFile) {
                const scriptContent = `@echo off
"${javaPath}" @user_jvm_args.txt @${argsFile} ${gui ? '' : '--nogui'} %*
pause
`;
                await fs.writeFile(path.join(installPath, 'start.bat'), scriptContent);

                const filesToDelete = [
                    'run.bat',
                    'run.sh',
                    'forge-installer.jar',
                    'forge-installer.jar.log',
                    'installer.log',
                    'README.txt'
                ];

                for (const file of filesToDelete) {
                    await fs.remove(path.join(installPath, file)).catch(() => { });
                }
            } else {
                const scriptContent = `@echo off
set "PATH=${path.dirname(javaPath)};%PATH%"
call run.bat ${gui ? '' : '--nogui'}
pause
`;
                await fs.writeFile(path.join(installPath, 'start.bat'), scriptContent);

                await fs.remove(path.join(installPath, 'forge-installer.jar')).catch(() => { });
                await fs.remove(path.join(installPath, 'installer.log')).catch(() => { });
            }

        } else {
            const files = await fs.readdir(installPath);
            const forgeJar = files.find(f => f.startsWith('forge-') && f.endsWith('.jar') && !f.includes('installer'));

            if (forgeJar) {
                const scriptContent = `@echo off
"${javaPath}" -Xms1024M -Xmx${memory}M -jar ${forgeJar} ${gui ? '' : '--nogui'}
pause
`;
                await fs.writeFile(path.join(installPath, 'start.bat'), scriptContent);
                await fs.remove(path.join(installPath, 'forge-installer.jar')).catch(() => { });
            } else {
                throw new Error('無法找到 Forge 啟動檔案 (run.bat 或 forge-universal.jar)');
            }
        }
    }

    async createStartScript(dir, memoryMB, gui, javaCommand = 'java') {
        const scriptPath = path.join(dir, 'start.bat');
        const guiFlag = gui ? '' : 'nogui';

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
