# 🔐 Reset Admin Password Guide

Since `admin.raiot@gmail.com` is a fake email without an inbox, you have **3 options** to reset the password:

## Option 1: Use Firebase Console (EASIEST - Recommended) ⭐

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **raiot-web-portal**
3. Go to **Authentication** → **Users** (in the left sidebar)
4. Find the user: **admin.raiot@gmail.com**
5. Click the **three dots (⋮)** next to the user
6. Click **"Reset password"** or **"Change password"**
7. Enter a new password
8. Click **"Save"**

**Done!** You can now login with the new password.

---

## Option 2: Use the Script (Requires Setup)

If you want to automate this, use the provided script:

### Step 1: Install Firebase Admin SDK
```bash
npm install firebase-admin
```

### Step 2: Get Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **raiot-web-portal**
3. Click the **gear icon** → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **"Generate new private key"**
6. Save the downloaded JSON file as `serviceAccountKey.json` in the project root (same level as `package.json`)

### Step 3: Run the Script
```bash
# Use default password: Admin@123456
node scripts/reset-admin-password.js

# Or specify your own password
node scripts/reset-admin-password.js "YourNewPassword123"
```

**⚠️ Important:** Add `serviceAccountKey.json` to `.gitignore` to keep it secure!

---

## Option 3: Create a New Admin Account

If you can't access Firebase Console, create a new admin account:

1. Go to `/auth/admin-signup`
2. Fill in the form:
   - **Full Name**: Your name
   - **Email**: Use a **real email** you can access (e.g., your personal Gmail)
   - **Role**: Admin
   - **Admin Registration Key**: `RAIOT_ADMIN_2024`
   - **Password**: Choose a strong password
3. Click **"Create Admin Account"**

**Note:** You'll have a new admin account with a real email that you can access.

---

## Quick Fix: Use Firebase Console

**The fastest way is Option 1** - just use Firebase Console to reset the password directly. No code needed!

1. Go to: https://console.firebase.google.com/project/raiot-web-portal/authentication/users
2. Find `admin.raiot@gmail.com`
3. Click three dots → Reset password
4. Set new password
5. Login with the new password

---

## Security Note

After resetting, make sure to:
- ✅ Save the password securely
- ✅ Consider using a real email for admin accounts
- ✅ Enable 2FA if possible
- ✅ Keep `serviceAccountKey.json` out of version control

