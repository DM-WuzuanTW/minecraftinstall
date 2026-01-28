# 📦 Single EXE Packaging & Obfuscation Roadmap

## 1. 原理架構 (Architecture)

我們不使用 `electron-builder`，而是採用「手動打包 + C# 殼層封裝」的策略。這樣可以最大程度控制最終產物，並隱藏原始碼。

**最終產物結構 (Virtual Filesystem):**
```
NanoInstaller.exe (C# Wrapper + Enigma Box)
 ├── (Hidden) app_core.exe (Electron Binary)
 ├── (Hidden) resources/
 │      └── app.asar (Obfuscated Source)
 └── (Hidden) rtimes/
        └── jre/ (Optional bundled Java)
```

## 2. 實作步驟 (Detailed Steps)

### Step A: 原始碼混淆 (Obfuscation)
使用 `javascript-obfuscator` 保護您的核心邏輯 (API fetchers, algorithms)。

**配置檔 `obfuscator-config.js`:**
```javascript
module.exports = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 1,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    target: 'node'
};
```
**執行命令:**
`npx javascript-obfuscator ./src --output ./dist-ofc --config obfuscator-config.js`

### Step B: Electron 基礎打包 (Packager)
將混淆後的代碼打包成資料夾。
`npx electron-packager ./dist-ofc NanoBanana --platform=win32 --arch=x64 --out=build --overwrite`

### Step C: C# Wrapper 編譯
編寫 C# Console App (如 `src/csharp/Program.cs`)，編譯為 `Wrapper.exe`。
- 功能：檢查環境 -> 呼叫 `./NanoBanana/NanoBanana.exe` (或改名為 `core.exe`)。

### Step D: Enigma Virtual Box 封裝 (The Magic)
這是將多個檔案合併為單一 EXE 的關鍵工具 (免費且強大)。

1. **Input File**: 選擇編譯好的 C# `Wrapper.exe`。
2. **Output File**: 設定為 `UnifiedInstaller.exe`。
3. **Files Add**: 
   - 將 Electron 打包出來的整包內容 (resources, dlls, executables) 拖入。
   - 設定屬性為 "Default" (寫入虛擬目錄)。
4. **壓縮**: 勾選 compress files 以減小體積。
5. **Process**: 點擊打包。

## 3. Server Properties Regex Helper
針對您提到的 `server.properties` 修改，請使用此正則表達式邏輯 (Node.js):

```javascript
const fs = require('fs');

function updateServerProp(filePath, key, value) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const regex = new RegExp(`^${key}=.*`, 'm');
    
    if (regex.test(content)) {
        // Replace existing key
        content = content.replace(regex, `${key}=${value}`);
    } else {
        // Append if not exists
        content += `\n${key}=${value}`;
    }
    fs.writeFileSync(filePath, content);
}
```

## 4. JVM Argument Generator
針對 Java 17+ 的優化參數生成器:

```javascript
function generateJvmArgs(ramGb) {
    const mem = ramGb * 1024;
    return [
        `-Xms${mem}M`,
        `-Xmx${mem}M`,
        '-XX:+UseG1GC', // Standard for modern MC
        '-XX:+ParallelRefProcEnabled',
        '-XX:MaxGCPauseMillis=200',
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:+DisableExplicitGC',
        '-XX:+AlwaysPreTouch',
        '-XX:G1NewSizePercent=30',
        '-XX:G1MaxNewSizePercent=40',
        '-XX:G1HeapRegionSize=8M',
        '-XX:G1ReservePercent=20',
        '-XX:G1HeapWastePercent=5',
        '-XX:G1MixedGCCountTarget=4'
    ];
}
```
