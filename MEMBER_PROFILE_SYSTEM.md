# RAIoT Member Profile System

## Overview
The RAIoT Member Profile System allows members to create public profiles accessible via QR codes on their ID cards. When someone scans a QR code, they'll be directed to the member's profile page.

## How It Works

### 1. QR Code Structure

#### For Localhost Testing (Development):
```
http://localhost:3000/members/[rollNumber]
```

For example:
- `http://localhost:3000/members/r00006`
- `http://localhost:3000/members/cs21001`

#### For Production (After Deployment):
```
https://raiot.site/members/[rollNumber]
```

For example:
- `https://raiot.site/members/r00006`
- `https://raiot.site/members/cs21001`

### 2. Member Registration Flow

#### For New Members:
1. **Scan QR Code** → If no profile exists, they see "Profile Not Found" with a registration button
2. **Click "Register Now"** → Redirected to `/members/register`
3. **Fill Registration Form** → Creates account and profile
4. **Profile Created** → Automatically redirected to their new profile page

#### For Existing Members:
1. **Login to Dashboard** → Go to `/dashboard/profile`
2. **Edit Profile** → Add personal info, skills, social links, etc.
3. **Save Changes** → Profile automatically becomes publicly accessible via QR code

### 3. Profile Features

#### Dashboard Profile (Private - for logged-in members):
- **Basic Information**: Name, email, phone, role
- **Academic Information**: Roll number, branch, year
- **About & Skills**: Bio, technical skills
- **Social Links**: GitHub, LinkedIn, website
- **Attendance**: Event participation history

#### Public Profile (Accessible via QR code):
- **Member Information**: Name, roll number, department, year
- **Contact Options**: Email, phone (if provided)
- **Social Links**: GitHub, LinkedIn, website links
- **Skills**: Technical skills as badges
- **About**: Personal bio
- **Membership Info**: Role, member since date
- **Event History**: Events attended with status

### 4. Firebase Configuration

#### Required Environment Variables:
Create a `.env.local` file with your Firebase configuration:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

#### Firestore Collections:
- **users**: Stores all member data including profiles
- **events**: Event information (if using event management)

### 5. URL Examples

#### Profile URLs:
- `/members/r00006` - Public profile for roll number r00006
- `/members/cs21001` - Public profile for roll number cs21001

#### Registration:
- `/members/register` - New member registration form

#### Dashboard:
- `/dashboard/profile` - Member profile editing (requires login)

### 6. Testing the System

1. **Test Profile Creation**:
   - Go to `/members/register`
   - Create a test account with a roll number
   - Verify profile appears at `/members/[rollNumber]`

2. **Test QR Code Flow**:
   - Visit `/members/[rollNumber]` for an existing member
   - Visit `/members/[rollNumber]` for a non-existent member
   - Verify registration flow works

3. **Test Profile Updates**:
   - Login to dashboard
   - Update profile information
   - Verify changes appear on public profile

### 7. Deployment Notes

- Ensure Firebase is properly configured in production
- Update QR code URLs to point to your production domain
- Test all flows after deployment

## Support

For any issues or questions about the member profile system, check:
1. Firebase console for data
2. Browser console for JavaScript errors
3. Network tab for API call issues
