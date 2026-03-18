Copy

@echo off
title FriendDiff - API Server
color 0A
 
echo ============================================
echo        FriendDiff API Server Launcher
echo ============================================
echo.
 
:: Di chuyen vao thu muc api-server (relative path tu vi tri file .bat)
cd /d "%~dp0..\api-server"
 
:: Kiem tra thu muc venv co ton tai khong
if not exist "venv\Scripts\python.exe" (
    echo [!] Khong tim thay virtual environment!
    echo [*] Dang tao venv va cai dat dependencies...
    echo.
 
    :: Tao venv moi
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Khong the tao venv. Hay dam bao Python da duoc cai dat!
        pause
        exit /b 1
    )
 
    :: Cai dat dependencies
    if exist "requirements.txt" (
        echo [*] Dang cai dat requirements.txt...
        venv\Scripts\pip.exe install -r requirements.txt
        if errorlevel 1 (
            echo [ERROR] Cai dat dependencies that bai!
            pause
            exit /b 1
        )
    ) else (
        echo [WARNING] Khong tim thay requirements.txt, bo qua buoc cai dat.
    )
 
    echo.
    echo [OK] Chuan bi moi truong thanh cong!
    echo.
)
 
:: Chay server
echo [*] Dang khoi dong API Server...
echo [*] Truy cap tai: http://127.0.0.1:8000
echo [*] Docs tai:     http://127.0.0.1:8000/docs
echo.
echo [Nhan CTRL+C de dung server]
echo ============================================
echo.
 
venv\Scripts\python.exe -m uvicorn app.main:app --reload
 
:: Neu server bi tat
echo.
echo [!] Server da dung.
pause