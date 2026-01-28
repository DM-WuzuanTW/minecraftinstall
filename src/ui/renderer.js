const { ipcRenderer } = require('electron');

const elements = {
    serverType: document.getElementById('server-type'),
    versionInput: document.getElementById('version-input'),
    versionBtn: document.getElementById('version-btn'),
    installPath: document.getElementById('install-path'),
    pathBtn: document.getElementById('path-btn'),
    installBtn: document.getElementById('install-btn'),
    resetBtn: document.getElementById('reset-btn'),
    acceptEula: document.getElementById('accept-eula'),
    enableGui: document.getElementById('enable-gui'),
    memorySlider: document.getElementById('memory-slider'),
    memoryInput: document.getElementById('memory-input'),
    propPort: document.getElementById('prop-port'),
    propMaxPlayers: document.getElementById('prop-maxplayers'),
    propMotd: document.getElementById('prop-motd'),
    propOnline: document.getElementById('prop-online'),
    progressSection: document.getElementById('progress-section'),
    progressText: document.getElementById('progress-text'),
    progressPercent: document.getElementById('progress-percent'),
    progressFill: document.getElementById('progress-fill'),
    statusText: document.getElementById('status-text'),
    helpBtn: document.getElementById('help-btn'),
    updateBtn: document.getElementById('update-btn'),
    modal: document.getElementById('modal-overlay'),
    modalList: document.getElementById('modal-list'),
    modalClose: document.getElementById('modal-close'),
    helpModal: document.getElementById('help-modal'),
    helpClose: document.getElementById('help-close')
};

let currentVersions = [];
let isInstalling = false;

elements.pathBtn.addEventListener('click', async () => {
    const path = await ipcRenderer.invoke('select-folder');
    if (path) {
        elements.installPath.value = path;
        showStatus('✅ 已選擇安裝位置');
    }
});

elements.serverType.addEventListener('change', () => {
    elements.versionInput.value = '';
    elements.versionInput.placeholder = `請選擇 ${elements.serverType.value} 版本`;
});

elements.versionBtn.addEventListener('click', async () => {
    const btn = elements.versionBtn;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ 載入中...';
    btn.classList.add('mc-animate-bounce');

    try {
        currentVersions = await ipcRenderer.invoke('get-versions', elements.serverType.value);
        if (currentVersions && currentVersions.length > 0) {
            showVersionModal(currentVersions);
            showStatus('✅ 版本清單已載入');
        } else {
            showStatus('❌ 無法取得版本清單', true);
        }
    } catch (error) {
        showStatus('❌ 載入版本時發生錯誤', true);
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
        btn.classList.remove('mc-animate-bounce');
    }
});

function showVersionModal(versions) {
    elements.modalList.innerHTML = versions.slice(0, 100).map(v => `
        <button class="w-full mc-btn mb-2 text-left" onclick="selectVersion('${v}')">
            ${v}
        </button>
    `).join('');

    elements.modal.classList.remove('hidden');
}

window.selectVersion = (version) => {
    elements.versionInput.value = version;
    elements.modal.classList.add('hidden');
    showStatus(`✅ 已選擇版本: ${version}`);
};

elements.modalClose.addEventListener('click', () => {
    elements.modal.classList.add('hidden');
});

elements.modal.addEventListener('click', (e) => {
    if (e.target === elements.modal) {
        elements.modal.classList.add('hidden');
    }
});

elements.memorySlider.addEventListener('input', (e) => {
    elements.memoryInput.value = e.target.value;
});

elements.memoryInput.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    if (!isNaN(val)) {
        val = Math.max(1024, Math.min(16384, val));
        elements.memorySlider.value = val;
        elements.memoryInput.value = val;
    }
});

elements.installBtn.addEventListener('click', async () => {
    if (isInstalling) return;

    const config = {
        serverType: elements.serverType.value,
        version: elements.versionInput.value,
        installPath: elements.installPath.value,
        options: {
            acceptEula: elements.acceptEula.checked,
            gui: elements.enableGui.checked,
            memory: parseInt(elements.memoryInput.value),
            createStartScript: true,
            serverProperties: {
                'server-port': elements.propPort.value,
                'max-players': elements.propMaxPlayers.value,
                'motd': elements.propMotd.value,
                'online-mode': elements.propOnline.value
            }
        }
    };

    if (!config.version) {
        showStatus('❌ 請選擇遊戲版本', true);
        elements.versionBtn.classList.add('mc-animate-shake');
        setTimeout(() => elements.versionBtn.classList.remove('mc-animate-shake'), 300);
        return;
    }

    if (!config.installPath) {
        showStatus('❌ 請選擇安裝位置', true);
        elements.pathBtn.classList.add('mc-animate-shake');
        setTimeout(() => elements.pathBtn.classList.remove('mc-animate-shake'), 300);
        return;
    }

    if (!config.options.acceptEula) {
        showStatus('❌ 請同意 EULA 條款', true);
        return;
    }

    isInstalling = true;
    elements.installBtn.disabled = true;
    elements.installBtn.textContent = '⏳ 安裝中...';
    elements.progressSection.classList.remove('hidden');
    updateProgress('準備下載伺服器檔案...', 0);
    showStatus('🔄 正在安裝伺服器...');

    try {
        const result = await ipcRenderer.invoke('start-installation', config);
        if (result.success) {
            updateProgress('✅ 安裝完成！', 100);
            showStatus('✅ 伺服器安裝成功！');
            setTimeout(() => {
                alert('🎉 安裝完成！\n\n伺服器已安裝在:\n' + result.path + '\n\n請執行 start.bat 啟動伺服器');
            }, 500);
        } else {
            updateProgress('❌ 安裝失敗', 0);
            showStatus(result.error || '安裝過程發生錯誤', true);
        }
    } catch (error) {
        updateProgress('❌ 發生錯誤', 0);
        showStatus('安裝錯誤: ' + error.message, true);
    } finally {
        isInstalling = false;
        elements.installBtn.disabled = false;
        elements.installBtn.textContent = '⚡ 開始安裝伺服器';
    }
});

elements.resetBtn.addEventListener('click', () => {
    if (confirm('確定要重置所有設定嗎？')) {
        elements.serverType.value = 'Paper';
        elements.versionInput.value = '';
        elements.installPath.value = '';
        elements.acceptEula.checked = true;
        elements.enableGui.checked = false;
        elements.memorySlider.value = 4096;
        elements.memoryInput.value = 4096;
        elements.propPort.value = 25565;
        elements.propMaxPlayers.value = 20;
        elements.propMotd.value = '一個全新的 Minecraft 伺服器';
        elements.propOnline.value = 'true';
        elements.progressSection.classList.add('hidden');
        showStatus('✅ 設定已重置');
    }
});

elements.helpBtn.addEventListener('click', () => {
    elements.helpModal.classList.remove('hidden');
});

elements.helpClose.addEventListener('click', () => {
    elements.helpModal.classList.add('hidden');
});

elements.helpModal.addEventListener('click', (e) => {
    if (e.target === elements.helpModal) {
        elements.helpModal.classList.add('hidden');
    }
});

elements.updateBtn.addEventListener('click', async () => {
    showStatus('🔄 檢查更新中...');
    await ipcRenderer.invoke('check-updates');
});

function updateProgress(text, percent) {
    elements.progressText.textContent = text;
    elements.progressPercent.textContent = Math.round(percent) + '%';
    elements.progressFill.style.width = percent + '%';
}

function showStatus(text, isError = false) {
    elements.statusText.textContent = text;
    elements.statusText.className = isError ? 'text-xs text-red-400 font-bold' : 'text-xs text-[#7cb342]';
}

ipcRenderer.on('download-progress', (event, data) => {
    const percent = data.progress || 0;
    updateProgress(`正在下載 ${data.filename}...`, percent);
});

ipcRenderer.on('download-complete', (event, data) => {
    updateProgress('下載完成，正在安裝...', 90);
});

ipcRenderer.on('download-error', (event, data) => {
    updateProgress('下載失敗', 0);
    showStatus(data.error, true);
});

ipcRenderer.on('update-status', (event, data) => {
    const { type, data: info } = data;

    if (type === 'checking-for-update') {
        showStatus('🔄 正在檢查更新...');
    } else if (type === 'update-available') {
        showStatus(`🎉 發現新版本 ${info.version}`);
    } else if (type === 'update-not-available') {
        showStatus('✅ 已是最新版本');
    } else if (type === 'download-progress') {
        const percent = Math.round(info.percent);
        showStatus(`⏬ 下載更新中: ${percent}%`);
    } else if (type === 'update-downloaded') {
        showStatus('✅ 更新已下載，重啟後安裝');
    }
});

ipcRenderer.invoke('get-app-version').then(version => {
    showStatus(`✅ 準備就緒 | 版本 v${version}`);
});
