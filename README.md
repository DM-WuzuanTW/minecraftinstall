# Minecraft Server Installer - 使用說明

## 快速開始

### 開發環境

1. 安裝依賴:
```bash
npm install
```

2. 啟動開發模式:
```bash
npm start
```

3. 編譯 CSS (開發時):
```bash
npm run watch:css
```

### 打包發布

1. 編譯並打包:
```bash
npm run dist
```

2. 產物位置:
- `dist/Minecraft Server Installer-2.0.0-Setup.exe` - 安裝程式
- `dist/win-unpacked/` - 免安裝版本

### 自動更新設定

專案已配置 GitHub Releases 自動更新。發布新版本:

1. 更新 `package.json` 的版本號
2. 重新打包
3. 在 GitHub 建立 Release 並上傳 Setup.exe
4. 使用者將自動收到更新通知

## 專案特色

### UI 設計
- 現代深色主題
- 使用 Lucide Icons SVG
- 無 emoji 使用
- 流暢的動畫效果
- 響應式布局

### 支援的伺服器
- Paper (高效能插件版)
- Purpur (Paper 分支)
- Fabric (輕量模組)
- Forge (重型模組)
- Vanilla (原版)

### 功能亮點
- 自動版本檢測
- 下載進度追蹤
- 記憶體配置 (1GB-16GB)
- server.properties 配置
- Java 環境檢測
- EULA 自動接受
- 啟動腳本生成

## 技術架構

### 核心模組
- `src/main/index.js` - Electron 主進程
- `src/main/updater.js` - 自動更新管理
- `src/main/downloader.js` - 檔案下載管理
- `src/main/installer.js` - 伺服器安裝邏輯
- `src/api/MinecraftAPI.js` - API 客戶端

### UI 層
- `src/ui/index.html` - 主介面
- `src/ui/renderer.js` - 渲染進程邏輯
- `src/ui/styles/input.css` - Tailwind 輸入
- `src/ui/styles/output.css` - 編譯後 CSS

## 開發指南

### 新增伺服器類型

1. 在 `MinecraftAPI.js` 添加獲取版本的方法
2. 在 `installer.js` 的 `getDownloadUrl` 添加下載邏輯
3. 在 `index.html` 的下拉選單添加選項

### 自訂 UI

修改 `src/ui/styles/input.css` 並重新編譯:
```bash
npm run build:css
```

## 授權

MIT License - 可自由修改與分發

## 開發團隊

DiamondHost Team  
Email: support@diamondhost.tw
