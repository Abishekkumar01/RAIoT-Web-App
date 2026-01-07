# RAIoT Club App

A Next.js application for the Robotics, Automation & IoT Club.

## 🚨 Important: OneDrive Sync Issues

If you're working on a OneDrive-synced folder on Windows, you may encounter EINVAL errors when running the development server. This is due to OneDrive's incompatibility with symbolic links in the `.next` directory.

### Permanent Solutions

#### Option 1: Use the Clean Development Script (Recommended)
```bash
# For Windows PowerShell users
npm run dev:clean:win

# For Windows Command Prompt users
npm run dev:clean:bat

# For other systems
npm run dev:clean

# Or simply double-click the start-dev.bat file in the root directory
```

#### Option 2: Manual Cleanup
If you encounter the EINVAL error, run these commands:
```bash
# Remove the .next directory
rmdir /s /q .next

# Remove other build artifacts
rmdir /s /q out
rmdir /s /q build

# Start the development server
npm run dev
```

#### Option 3: Move Project Outside OneDrive
The most reliable solution is to move your project to a local folder outside of OneDrive:
1. Copy your project to `C:\Projects\raiot-club-app` or similar
2. Work from that location instead

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation
```bash
# Install dependencies
npm install

# Start development server (with cleanup)
npm run dev:clean:win  # Windows
npm run dev:clean      # Other systems

# Or start normally (may fail on OneDrive)
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run dev:clean` - Clean cache and start dev server
- `npm run dev:clean:win` - Clean cache and start dev server (Windows PowerShell)
- `npm run dev:clean:bat` - Clean cache and start dev server (Windows Command Prompt)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `start-dev.bat` - Double-click to start dev server with cleanup (Windows)

## 📁 Project Structure
```
raiot-club-app/
├── app/                 # Next.js app directory
├── components/          # Reusable components
├── lib/                 # Utilities and contexts
├── public/             # Static assets
├── scripts/            # Development scripts
└── styles/             # Global styles
```

## 🔧 Troubleshooting

### Common Issues

1. **EINVAL Error on Windows OneDrive**
   - Use `npm run dev:clean:win` instead of `npm run dev`
   - Or move project outside OneDrive folder

2. **Port 3000 Already in Use**
   ```bash
   # Kill process on port 3000
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

3. **Node Modules Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

## 🛠️ Development

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting

### Git Workflow
- Create feature branches from `main`
- Use conventional commit messages
- Submit pull requests for review

## 📝 Environment Variables

Create a `.env.local` file in the root directory:
```env
# Add your environment variables here
NEXT_PUBLIC_API_URL=your_api_url_here
```

## 🚀 Deployment

The app is configured for deployment on Vercel:
1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect Next.js and deploy
3. Environment variables can be set in Vercel dashboard

## 📄 License

This project is licensed under the MIT License.
