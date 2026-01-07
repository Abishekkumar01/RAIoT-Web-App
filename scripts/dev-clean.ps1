# PowerShell script to clean Next.js cache and start development server
# This script handles OneDrive sync issues on Windows

Write-Host "🧹 Cleaning Next.js cache and build files..." -ForegroundColor Cyan

# Function to safely remove directory
function Remove-DirectorySafely {
    param([string]$Path)
    
    if (Test-Path $Path) {
        try {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            Write-Host "✅ Removed: $Path" -ForegroundColor Green
        }
        catch {
            Write-Host "⚠️  Warning: Could not remove $Path`: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

# Clean common Next.js directories
$dirsToClean = @(
    ".next",
    "out", 
    "build",
    "node_modules\.cache"
)

foreach ($dir in $dirsToClean) {
    Remove-DirectorySafely -Path $dir
}

# Clean TypeScript build info files
$tsBuildInfoFiles = @(
    "*.tsbuildinfo",
    "next-env.d.ts"
)

foreach ($pattern in $tsBuildInfoFiles) {
    try {
        Get-ChildItem -Path . -Name $pattern -Recurse | ForEach-Object {
            Remove-Item -Path $_ -Force -ErrorAction SilentlyContinue
        }
    }
    catch {
        # Ignore errors if files don't exist
    }
}

Write-Host "✨ Cleanup completed! Starting development server..." -ForegroundColor Green
Write-Host ""

# Start the development server
try {
    npm run dev
}
catch {
    Write-Host "❌ Failed to start development server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
