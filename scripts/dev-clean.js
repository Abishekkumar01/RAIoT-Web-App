const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning Next.js cache and build files...');

// Function to safely remove directory
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      // Use rimraf for cross-platform directory removal
      if (process.platform === 'win32') {
        // On Windows, use rmdir with /s /q for recursive deletion
        execSync(`rmdir /s /q "${dirPath}"`, { stdio: 'inherit' });
      } else {
        // On Unix-like systems, use rm -rf
        execSync(`rm -rf "${dirPath}"`, { stdio: 'inherit' });
      }
      console.log(`✅ Removed: ${dirPath}`);
    } catch (error) {
      console.log(`⚠️  Warning: Could not remove ${dirPath}: ${error.message}`);
    }
  }
}

// Clean common Next.js directories
const dirsToClean = [
  '.next',
  'out',
  'build',
  'node_modules/.cache'
];

dirsToClean.forEach(dir => {
  removeDirectory(dir);
});

// Clean TypeScript build info
const tsBuildInfoFiles = [
  '*.tsbuildinfo',
  'next-env.d.ts'
];

tsBuildInfoFiles.forEach(pattern => {
  try {
    if (process.platform === 'win32') {
      execSync(`del /f /q "${pattern}"`, { stdio: 'inherit' });
    } else {
      execSync(`find . -name "${pattern}" -delete`, { stdio: 'inherit' });
    }
  } catch (error) {
    // Ignore errors if files don't exist
  }
});

console.log('✨ Cleanup completed! Starting development server...\n');

// Start the development server
try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start development server:', error.message);
  process.exit(1);
}
