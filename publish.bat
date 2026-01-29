@echo off
setlocal EnableDelayedExpansion

title Minecraft Server Installer - 快速發布

echo ========================================================
echo    Minecraft 伺服器安裝器 - 快速發布工具
echo ========================================================
echo.
echo 此腳本會自動:
echo  1. 遞增版本號 (+0.0.1)
echo  2. Commit 版本變更
echo  3. 建立並推送 Git Tag
echo  4. 編譯 CSS
echo  5. 打包應用程式 (快速模式)
echo  6. 上傳到 GitHub Releases
echo.
echo --------------------------------------------------------
pause
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 未安裝 Node.js
    pause
    exit /b
)

if not "%GH_TOKEN%"=="" goto TokenFound

for /f "tokens=3*" %%a in ('reg query HKCU\Environment /v GH_TOKEN 2^>nul') do set GH_TOKEN=%%a
if not "%GH_TOKEN%"=="" goto TokenFound

where gh >nul 2>nul
if %errorlevel% equ 0 (
    echo [資訊] 檢測到 GitHub CLI，嘗試取得 token...
    for /f %%t in ('gh auth token') do set GH_TOKEN=%%t
)
if not "%GH_TOKEN%"=="" goto TokenFound

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

echo [步驟 1/6] 遞增版本號...
call npm version patch --no-git-tag-version
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set VERSION=%%v
echo [完成] 新版本: v%VERSION%
echo.

echo [步驟 2/6] 提交版本變更...
git add package.json
git commit -m "chore: bump version to v%VERSION%"
echo [完成] 版本已提交
echo.

echo [步驟 3/6] 推送到 GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo [錯誤] 推送失敗，請檢查網路或權限
    pause
    exit /b
)
echo [完成] 代碼已推送
echo.

echo [步驟 4/6] 建立並推送 Tag v%VERSION%...
git tag v%VERSION%
git push origin v%VERSION%
if %errorlevel% neq 0 (
    echo [錯誤] Tag 推送失敗
    pause
    exit /b
)
echo [完成] Tag 已推送
echo.

echo [步驟 5/6] 編譯 Tailwind CSS...
call npm run build:css
if %errorlevel% neq 0 (
    echo [錯誤] CSS 編譯失敗
    pause
    exit /b
)
echo [完成] CSS 編譯完成
echo.

echo [清理] 移除舊的打包檔案...
if exist dist rmdir /s /q dist
echo [完成] 清理完成
echo.

echo [步驟 6/6] 打包應用程式並上傳到 GitHub...
echo    - 使用快速模式 (無壓縮)
echo    - 預計 1-3 分鐘完成
echo.

set ELECTRON_BUILDER_TIMEOUT=300000
call npm run dist -- --publish always

if %errorlevel% neq 0 (
    echo.
    echo [錯誤] 發生錯誤
    echo     可能原因:
    echo     1. Token 無效或過期
    echo     2. 網路問題
    echo     3. 標籤已存在草稿發布
    echo     4. 打包過程出錯
    echo.
    echo     建議: 檢查上方的錯誤訊息
    pause
    exit /b
)

echo.
echo ========================================================
echo  發布完成！Release v%VERSION% 已上線
echo  https://github.com/DM-WuzuanTW/minecraftinstall/releases/tag/v%VERSION%
echo ========================================================
echo.
echo 檔案大小會比較大 (因使用無壓縮模式以加快打包速度)
echo 使用者可以透過應用程式內的自動更新功能取得此版本
echo.
pause
