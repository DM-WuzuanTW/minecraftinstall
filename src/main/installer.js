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

            let targetJarName = 'server.jar';
            if (serverType.toLowerCase() === 'forge') {
                targetJarName = 'forge-installer.jar';
            }

            const targetPath = path.join(installPath, targetJarName);
            await fs.move(jarPath, targetPath, { overwrite: true });

            // Special handling for Forge
            if (serverType.toLowerCase() === 'forge') {
                updateProgress('正在執行 Forge 安裝程序... (這可能需要幾分鐘)', 95);
                await this.installForge(installPath, javaPath, targetJarName);
            }

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

    async installForge(dir, javaPath, installerName) {
        return new Promise((resolve, reject) => {
            console.log('Running Forge Installer:', javaPath, installerName);
            const process = spawn(javaPath, ['-jar', installerName, '--installServer'], {
                cwd: dir,
                stdio: 'ignore' // or 'inherit' for debugging
            });
            process.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('Forge Installer failed with code ' + code));
            });
            process.on('error', (err) => reject(err));
        });
    }

    async createForgeStartScript(installPath, memory, gui, javaPath) {
        // Modern Forge (1.17+) uses run.bat and user_jvm_args.txt
        const runBatPath = path.join(installPath, 'run.bat');
        const runShPath = path.join(installPath, 'run.sh');

        // Write memory settings to user_jvm_args.txt
        const argsContent = `# Xmx and Xms set the maximum and minimum RAM usage of your server.
-Xms1024M
-Xmx${memory}M
`;
        await fs.writeFile(path.join(installPath, 'user_jvm_args.txt'), argsContent);

        // Check if run.bat exists (Modern Forge)
        if (await fs.pathExists(runBatPath) || await fs.pathExists(runShPath)) {
            // Create a start.bat that calls run.bat but ensures we use OUR java
            // Wait, run.bat usually tries to find java. 
            // We can set JAVA_HOME or just edit user_jvm_args? No user_jvm_args is for JVM args.
            // run.bat uses "java" command. Use PATH.

            // To be safe, we generate our own simple start script that mimics run.bat but uses our java path
            // Parsing run.bat is hard. 
            // EASIEST WAY: Set PATH before calling run.bat

            const scriptContent = `@echo off
set "PATH=${path.dirname(javaPath)};%PATH%"
call run.bat ${gui ? '' : '--nogui'}
pause
`;
            await fs.writeFile(path.join(installPath, 'start.bat'), scriptContent);
        } else {
            // Older Forge: Look for forge-universal.jar or similar
            const files = await fs.readdir(installPath);
            const forgeJar = files.find(f => f.startsWith('forge-') && f.endsWith('.jar') && !f.includes('installer'));

            if (forgeJar) {
                const scriptContent = `@echo off
"${javaPath}" -Xms1024M -Xmx${memory}M -jar ${forgeJar} ${gui ? '' : '--nogui'}
pause
`;
                await fs.writeFile(path.join(installPath, 'start.bat'), scriptContent);
            } else {
                throw new Error('無法找到 Forge 啟動檔案 (run.bat 或 forge-universal.jar)');
            }
        }
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
