@echo off
title FriendDiff - Launcher
color 0E
 
echo ============================================
echo          FriendDiff - Full Launcher
echo ============================================
echo.
echo [*] Dang khoi dong tat ca dich vu...
echo.
 
:: Chay API Server trong cua so rieng
echo [1/2] Khoi dong API Server...
start "FriendDiff - API Server" cmd /k "%~dp0auto-run\run-api-server.bat"
 
:: Doi 2 giay de api-server khoi dong truoc
timeout /t 2 /nobreak >nul
 
:: Chay Extension Builder trong cua so rieng
echo [2/2] Khoi dong Extension Client Builder...
start "FriendDiff - Extension Builder" cmd /k "%~dp0auto-run\run-extension.bat"
 
echo.
echo ============================================
echo [OK] Da mo 2 cua so rieng biet:
echo      - API Server    ^(mau xanh la^)
echo      - Extension     ^(mau xanh duong^)
echo ============================================
echo.
echo Cua so nay co the dong lai.
timeout /t 5 /nobreak >nul
exit