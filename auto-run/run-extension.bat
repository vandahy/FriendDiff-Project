@echo off
title FriendDiff - Extension Client Builder
color 0B

echo ============================================
echo     FriendDiff Extension Client Builder
echo ============================================
echo.

:: Di chuyen vao thu muc extension-client (relative path tu vi tri file .bat)
cd /d "%~dp0..\extension-client"

:: Kiem tra yarn co san khong
where yarn >nul 2>&1
if errorlevel 1 (
    echo [!] Khong tim thay yarn!
    echo [*] Dang cai dat yarn qua npm...
    echo.

    :: Kiem tra npm truoc
    where npm >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Khong tim thay npm. Hay cai dat Node.js tai: https://nodejs.org
        pause
        exit /b 1
    )

    npm install -g yarn
    if errorlevel 1 (
        echo [ERROR] Cai dat yarn that bai!
        pause
        exit /b 1
    )

    echo [OK] Da cai yarn thanh cong!
    echo.
)

:: Kiem tra node_modules co ton tai khong
if not exist "node_modules\" (
    echo [!] Khong tim thay node_modules!
    echo [*] Dang chay yarn install de cai dat dependencies...
    echo.

    yarn install
    if errorlevel 1 (
        echo [ERROR] yarn install that bai!
        pause
        exit /b 1
    )

    echo.
    echo [OK] Cai dat dependencies thanh cong!
    echo.
)

:: Build extension
echo [*] Dang build Extension Client...
echo ============================================
echo.

yarn build

if errorlevel 1 (
    echo.
    echo [ERROR] Build that bai! Kiem tra lai loi phia tren.
    pause
    exit /b 1
)

echo.
echo ============================================
echo [OK] Build thanh cong!
echo [*] Output nam tai: extension-client\dist\
echo [*] Load vao Chrome: chrome://extensions ^> Load unpacked ^> chon thu muc dist
echo ============================================
echo.
pause