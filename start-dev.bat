@echo off
title RAIoT Club App - Development Server
echo ========================================
echo    RAIoT Club App - Development Server
echo ========================================
echo.

echo 🧹 Cleaning Next.js cache...
if exist ".next" (
    rmdir /s /q ".next"
    echo ✅ Removed .next directory
)

if exist "out" (
    rmdir /s /q "out"
    echo ✅ Removed out directory
)

if exist "build" (
    rmdir /s /q "build"
    echo ✅ Removed build directory
)

echo.
echo ✨ Starting development server...
echo 🌐 Server will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

npm run dev

pause
