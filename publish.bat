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
echo  4. GitHub Actions 會自動打包並發布
echo.
echo --------------------------------------------------------
pause
echo.

REM --- 檢查 Node.js ---
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 未安裝 Node.js
    pause
    exit /b
)

REM --- 檢查是否有未提交的變更 ---
git diff --quiet
if %errorlevel% neq 0 (
    echo [警告] 您有未提交的變更
    echo.
    set /p "COMMIT_FIRST=是否要先提交這些變更? (y/n): "
    if /i "!COMMIT_FIRST!"=="y" (
        set /p "COMMIT_MSG=請輸入 commit 訊息: "
        git add .
        git commit -m "!COMMIT_MSG!"
        echo [完成] 變更已提交
    ) else (
        echo [繼續] 跳過提交，直接發布
    )
    echo.
)

REM --- 自動遞增版本 ---
echo [步驟 1/4] 遞增版本號...
call npm version patch --no-git-tag-version
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set VERSION=%%v
echo [完成] 新版本: v%VERSION%
echo.

REM --- Commit 版本變更 ---
echo [步驟 2/4] 提交版本變更...
git add package.json
git commit -m "chore: bump version to v%VERSION%"
echo [完成] 版本已提交
echo.

REM --- 推送代碼 ---
echo [步驟 3/4] 推送到 GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo [錯誤] 推送失敗，請檢查網路或權限
    pause
    exit /b
)
echo [完成] 代碼已推送
echo.

REM --- 建立並推送 Tag ---
echo [步驟 4/4] 建立並推送 Tag v%VERSION%...
git tag v%VERSION%
git push origin v%VERSION%
if %errorlevel% neq 0 (
    echo [錯誤] Tag 推送失敗
    pause
    exit /b
)
echo [完成] Tag 已推送
echo.

echo ========================================================
echo  發布流程已啟動！
echo ========================================================
echo.
echo 版本: v%VERSION%
echo 請前往 GitHub Actions 查看打包進度:
echo    https://github.com/DM-WuzuanTW/minecraftinstall/actions
echo.
echo 預計 3-5 分鐘後完成打包
echo 完成後會自動發布到 Releases 頁面:
echo    https://github.com/DM-WuzuanTW/minecraftinstall/releases
echo.
echo --------------------------------------------------------
echo 提示: Actions 會自動編譯 CSS、打包 ZIP、建立 Release
echo --------------------------------------------------------
echo.
pause
