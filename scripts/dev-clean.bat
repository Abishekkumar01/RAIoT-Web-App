@echo off
echo 🧹 Cleaning Next.js cache and build files...

REM Remove .next directory
if exist ".next" (
    rmdir /s /q ".next"
    echo ✅ Removed: .next
)

REM Remove out directory
if exist "out" (
    rmdir /s /q "out"
    echo ✅ Removed: out
)

REM Remove build directory
if exist "build" (
    rmdir /s /q "build"
    echo ✅ Removed: build
)

REM Remove node_modules cache
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo ✅ Removed: node_modules\.cache
)

REM Remove TypeScript build info files
if exist "*.tsbuildinfo" (
    del /f /q "*.tsbuildinfo"
    echo ✅ Removed: TypeScript build info files
)

if exist "next-env.d.ts" (
    del /f /q "next-env.d.ts"
    echo ✅ Removed: next-env.d.ts
)

echo ✨ Cleanup completed! Starting development server...
echo.

REM Start the development server
npm run dev
