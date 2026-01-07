# 🚀 Team Management System

## Overview

A comprehensive team management system integrated into guest and member profiles that allows users to create teams, join teams using unique IDs, and manage team invitations with pending status.

## ✨ Features Implemented

### 🎯 **Core Functionality**
- ✅ **Create Team**: Users can create new teams and become team leaders
- ✅ **Join Team**: Users can join teams by entering a member's unique ID
- ✅ **Unique ID Lookup**: Search for teams using member's unique ID (RAIoT00001, etc.)
- ✅ **Invitation System**: Request to join teams with pending status
- ✅ **Accept/Reject Invitations**: Team leaders can accept or reject join requests
- ✅ **Real-time Updates**: Live updates for team changes and invitations

### 🔐 **Security & Permissions**
- ✅ **Firestore Rules**: Updated rules for team and invitation management
- ✅ **User Authentication**: Only authenticated users can manage teams
- ✅ **Role-based Access**: Team leaders have special permissions
- ✅ **Data Validation**: Proper validation for all team operations

## 🏗️ Architecture

### **Components Created/Modified**

1. **ProfileTeamManagement.tsx** - Main team management component
2. **Guest Profile Page** - Integrated team management section
3. **Member Dashboard Profile** - Integrated team management section
4. **Firestore Rules** - Updated for team invitations

### **Data Structures**

#### Team Document Structure
```javascript
{
  id: string,
  teamName: string,
  members: TeamMember[],
  leaderId: string,
  createdAt: Date,
  maxSize: number,
  pendingInvitations: {
    [userId]: {
      displayName: string,
      uniqueId: string,
      requestedAt: Date
    }
  }
}
```

#### Team Invitation Structure
```javascript
{
  id: string,
  teamId: string,
  teamName: string,
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  status: 'pending' | 'accepted' | 'rejected',
  createdAt: Date,
  updatedAt: Date
}
```

## 🎮 User Experience Flow

### **1. Create Team**
```
User clicks "Create Team" 
    ↓
Enters team name
    ↓
Team created with user as leader
    ↓
Success message displayed
```

### **2. Join Team**
```
User clicks "Join Team"
    ↓
Enters member's unique ID (e.g., RAIoT00001)
    ↓
System searches for team
    ↓
Team found → Shows team info
    ↓
User clicks "Request to Join"
    ↓
Invitation sent to team leader
    ↓
Status: "Pending"
```

### **3. Accept/Reject Invitations**
```
Team leader sees pending invitation
    ↓
Clicks "Accept" or "Reject"
    ↓
If Accept: User added to team
    ↓
If Reject: Invitation marked as rejected
    ↓
Real-time updates for all users
```

## 🔧 Technical Implementation

### **Key Functions**

#### Search Team by Unique ID
```typescript
const searchTeamByUniqueId = async () => {
  // 1. Find user by unique ID
  // 2. Find team where user is a member
  // 3. Display team information
  // 4. Allow join request
}
```

#### Request to Join Team
```typescript
const requestToJoinTeam = async (teamId: string, teamName: string) => {
  // 1. Create invitation document
  // 2. Add to team's pending invitations
  // 3. Send notification to team leader
}
```

#### Accept/Reject Invitation
```typescript
const acceptInvitation = async (invitationId: string, teamId: string) => {
  // 1. Add user to team members
  // 2. Update invitation status
  // 3. Remove from pending invitations
}
```

### **Real-time Updates**
- Uses Firestore `onSnapshot` for live updates
- Team changes reflect immediately
- Invitation status updates in real-time
- No page refresh required

## 📱 UI Components

### **Team Management Card**
- **Create Team Section**: Form to create new teams
- **Join Team Section**: Search by unique ID functionality
- **Current Team Display**: Shows user's current team with members
- **Pending Invitations**: List of received invitations
- **Sent Invitations**: List of sent join requests

### **Visual Elements**
- 🏆 **Team Leader Badge**: Crown icon for team leaders
- ⏳ **Pending Status**: Clock icon for pending invitations
- ✅ **Accept Button**: Green checkmark for accepting
- ❌ **Reject Button**: Red X for rejecting
- 👥 **Team Members**: Avatar and info display

## 🔒 Security Features

### **Firestore Rules**
```javascript
// Teams: Allow read/write for members and leaders
match /teams/{teamId} {
  allow read: if request.auth != null && (
    isAdmin() ||
    resource.data.members[request.auth.uid] != null ||
    resource.data.pendingInvitations[request.auth.uid] != null
  );
  allow write: if request.auth != null && (
    isAdmin() ||
    resource.data.members[request.auth.uid] != null ||
    resource.data.leaderId == request.auth.uid
  );
}

// Team Invitations: Allow access for sender and receiver
match /teamInvitations/{invitationId} {
  allow read, write: if request.auth != null && (
    isAdmin() ||
    resource.data.fromUserId == request.auth.uid ||
    resource.data.toUserId == request.auth.uid
  );
}
```

### **Validation**
- ✅ User must be authenticated
- ✅ Team size limits enforced
- ✅ Duplicate team membership prevented
- ✅ Unique ID format validation
- ✅ Proper error handling

## 🎯 Integration Points

### **Profile Pages**
- **Guest Profile**: Team management section appears after unique ID generation
- **Member Dashboard**: Team management integrated into profile page
- **Conditional Display**: Only shows when user has unique ID

### **Unique ID System**
- **Seamless Integration**: Uses existing unique ID generation system
- **ID Lookup**: Searches teams by member's unique ID
- **Validation**: Ensures unique IDs are properly formatted

## 🧪 Testing Scenarios

### **Test Cases**
1. **Create Team**: User creates team and becomes leader
2. **Join Team**: User joins team using another member's unique ID
3. **Accept Invitation**: Team leader accepts join request
4. **Reject Invitation**: Team leader rejects join request
5. **Real-time Updates**: Changes reflect immediately across users
6. **Error Handling**: Proper error messages for invalid operations

### **Edge Cases**
- ✅ Team full (max size reached)
- ✅ User already in team
- ✅ Invalid unique ID
- ✅ User not found
- ✅ Network errors
- ✅ Permission denied

## 🚀 Deployment Steps

### **1. Deploy Firestore Rules**
```bash
firebase deploy --only firestore:rules
```

### **2. Restart Development Server**
```bash
npm run dev
```

### **3. Test the System**
1. Create a test account
2. Generate unique ID
3. Create a team
4. Test joining with another account
5. Test invitation acceptance/rejection

## 📊 Expected Results

### **User Experience**
- ✅ Smooth team creation process
- ✅ Easy team joining with unique ID lookup
- ✅ Clear invitation management
- ✅ Real-time updates
- ✅ Intuitive UI/UX

### **Technical Performance**
- ✅ Fast unique ID lookups
- ✅ Efficient real-time updates
- ✅ Proper error handling
- ✅ Secure data access
- ✅ Scalable architecture

## 🎉 Summary

The team management system provides:

- **Complete Team Lifecycle**: Create → Join → Manage → Collaborate
- **Unique ID Integration**: Seamless integration with existing ID system
- **Real-time Collaboration**: Live updates for all team activities
- **Secure Operations**: Proper authentication and authorization
- **User-friendly Interface**: Intuitive design for all user types

### **Key Benefits**
1. **Easy Team Formation**: Simple process to create and join teams
2. **Unique ID Based**: Uses the sequential unique ID system
3. **Real-time Updates**: No page refresh needed
4. **Secure**: Proper Firestore rules and validation
5. **Integrated**: Seamlessly integrated into existing profile pages

---

## 🎯 **IMPLEMENTATION COMPLETE!**

The team management system is now fully integrated into both guest and member profiles. Users can:

1. **Create teams** and become leaders
2. **Join teams** using unique IDs (RAIoT00001, etc.)
3. **Manage invitations** with accept/reject functionality
4. **See real-time updates** for all team activities

**Deploy the Firestore rules and restart your server to activate the team management system!**
