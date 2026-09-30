@echo off
echo ==========================================================
echo  EkshitaScreen -- Local Management Dashboard ^& Backend
echo ==========================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required to run EkshitaScreen.
    echo Please install Node.js v18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detected.

if not exist "node_modules" (
    echo Installing dependencies with npm...
    call npm install
)

if not exist "storage\media" mkdir storage\media
if not exist "storage\thumbnails" mkdir storage\thumbnails
if not exist "storage\downloads" mkdir storage\downloads

echo.
echo Starting EkshitaScreen Dashboard at http://localhost:3000 ...
echo.

call npm run dev
pause
