@echo off
setlocal EnableDelayedExpansion

title Minecraft Server Installer - 自動發布工具

echo ========================================================
echo    Minecraft 伺服器安裝器 - 自動發布發布工具
echo ========================================================
echo.

REM 檢查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 未安裝 Node.js 或未加入 PATH
    pause
    exit /b
)

REM --- 自動檢測 GITHUB TOKEN ---
if not "%GH_TOKEN%"=="" goto TokenFound

REM 從系統環境變數檢查
for /f "tokens=3*" %%a in ('reg query HKCU\Environment /v GH_TOKEN 2^>nul') do set GH_TOKEN=%%a
if not "%GH_TOKEN%"=="" goto TokenFound

REM 嘗試使用 GitHub CLI
where gh >nul 2>nul
if %errorlevel% equ 0 (
    echo [資訊] 檢測到 GitHub CLI，嘗試取得 token...
    for /f %%t in ('gh auth token') do set GH_TOKEN=%%t
)
if not "%GH_TOKEN%"=="" goto TokenFound

REM 如果還是沒有，提示使用者輸入
echo.
echo [!] Electron-Builder 需要 GitHub Personal Access Token 才能上傳檔案
echo     (這與您的 Git 登入不同，需要有 repo 權限的 token)
echo.
echo     這只需要設定一次，我會幫您儲存到系統環境變數
echo.
set /p "GH_TOKEN=請貼上您的 GitHub Token (ghp_...): "

if "%GH_TOKEN%"=="" (
    echo.
    echo [錯誤] 未提供 token，無法上傳發布檔案
    echo         構建會完成，但您需要手動上傳
    pause
    exit /b
) else (
    echo.
    echo [設定] 正在儲存 token 到系統環境變數...
    setx GH_TOKEN "%GH_TOKEN%"
    echo [設定] Token 已儲存！下次不需要再輸入
)

:TokenFound
set GH_TOKEN=%GH_TOKEN%

echo.
echo ========================================================
echo  開始發布流程
echo ========================================================
echo.

REM --- 自動遞增版本 ---
echo [執行] 自動遞增版本號...
call npm version patch --no-git-tag-version
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set VERSION=%%v
echo [完成] 新版本: v%VERSION%

echo.
echo --------------------------------------------------------
echo  目標發布版本: v%VERSION%
echo --------------------------------------------------------
echo.

REM --- GIT 操作 ---
echo [步驟 1/4] 同步 Git 儲存庫...
git add .
git commit -m "chore: release v%VERSION%" >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ 變更已提交
) else (
    echo    - 沒有變更需要提交
)

echo    - 推送代碼到 GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo    [警告] 推送失敗，請檢查網路或權限
)

REM 處理 Tag
git tag v%VERSION% >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ 建立標籤 v%VERSION%
    git push origin v%VERSION%
) else (
    echo    - 標籤 v%VERSION% 已存在
    git push origin v%VERSION% >nul 2>&1
)

echo.

REM --- 編譯 CSS ---
echo [步驟 2/4] 編譯 Tailwind CSS...
call npm run build:css
if %errorlevel% neq 0 (
    echo [錯誤] CSS 編譯失敗
    pause
    exit /b
)
echo    ✓ CSS 編譯完成
echo.

REM --- 打包與發布 ---
echo [步驟 3/4] 打包應用程式並上傳到 GitHub...
echo    - 這可能需要幾分鐘，請稍候...
echo.

call npm run dist -- --publish always

if %errorlevel% neq 0 (
    echo.
    echo [X] 發生錯誤
    echo     可能原因:
    echo     1. Token 無效或過期
    echo     2. 網路問題
    echo     3. 標籤已存在草稿發布
    echo     4. 打包過程出錯
    pause
    exit /b
)

echo.
echo [步驟 4/4] 清理快取...
echo    ✓ 完成
echo.

echo ========================================================
echo  ✅ 成功！Release v%VERSION% 已發布
echo  🔗 連結: https://github.com/DM-WuzuanTW/minecraftinstall/releases/tag/v%VERSION%
echo ========================================================
echo.
echo 📦 使用者可以透過應用程式內的自動更新功能取得此版本
echo.
pause
