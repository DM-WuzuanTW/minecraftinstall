# Minecraft Server Installer

> 簡單易用的 Minecraft 伺服器安裝工具 - Minecraft 工作台風格設計

## 特色

- **Minecraft 主題設計** - 木質紋理背景、石質按鈕、像素藝術風格
- **完整中文化** - 繁體中文介面，新手友善
- **3 步驟安裝** - 選類型 → 選版本 → 選位置，簡單完成
- **自動更新** - 內建更新系統，永遠保持最新版本
- **免安裝** - 下載解壓即用，不需要安裝程序

## 下載

前往 [Releases](https://github.com/DM-WuzuanTW/minecraftinstall/releases/latest) 下載最新版本

## 快速開始

### 使用者

1. 下載 `Minecraft Server Installer-x.x.x-Portable.zip`
2. 解壓縮到任意位置
3. 執行 `Minecraft Server Installer.exe`
4. 依照介面指示完成伺服器安裝

### 支援的伺服器類型

| 類型 | 說明 | 適合對象 |
|------|------|----------|
| **Paper** | 高效能、支援插件 | 推薦新手 |
| **Purpur** | Paper 增強版 | 進階玩家 |
| **Fabric** | 輕量模組支援 | 模組玩家 |
| **Forge** | 大型模組支援 | 模組玩家 |
| **Vanilla** | 官方原版 | 原版體驗 |

## 開發

### 環境要求

- Node.js 18+
- npm

### 本地運行

```bash
# 安裝依賴
npm install

# 編譯 CSS (開發時)
npm run watch:css

# 啟動應用
npm start
```

### 打包

```bash
# 打包免安裝版 ZIP
npm run dist
```

### 發布流程

使用自動化發布腳本:

```bash
# 執行發布腳本
publish.bat
```

腳本會自動:
1. 版本號 +0.0.1
2. Commit 版本變更
3. 建立並推送 Tag
4. 觸發 GitHub Actions 自動打包和發布

## 使用說明

### 基本設定

1. **選擇伺服器類型** - 新手建議選擇 Paper
2. **選擇遊戲版本** - 建議選擇最新穩定版
3. **選擇安裝位置** - 選擇一個空資料夾

### 進階設定 (選填)

- **記憶體配置** - 建議至少 2GB (2048 MB)
- **伺服器端口** - 預設 25565
- **最大玩家數** - 預設 20 人
- **正版驗證** - 根據需求開啟或關閉

### 記憶體建議

| 玩家數 | 建議記憶體 |
|--------|------------|
| 1-5 人 | 2-4 GB |
| 5-10 人 | 4-6 GB |
| 10+ 人 | 8+ GB |

## 介面預覽

- 深棕色木質紋理背景 (橡木材質)
- 灰色石質 3D 按鈕
- 工作台風格標題欄
- 8-bit 像素藝術風格
- 清晰的步驟指引

## 授權

MIT License

## 支援

- 問題回報: [GitHub Issues](https://github.com/DM-WuzuanTW/minecraftinstall/issues)
- 開發團隊: DiamondHost

---

Made by DiamondHost Team
