# 🔥 Firebase Setup Guide for ConnectUs Location Tracker

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"**
3. Enter project name: `connectus-location-tracker`
4. Enable Google Analytics (optional)
5. Click **"Create project"**

## Step 2: Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable **"Email/Password"**
5. **IMPORTANT**: Enable **"Email link (passwordless sign-in)"** if you want
6. Save changes

## Step 3: Configure Email Verification

1. In Authentication → **Templates** tab
2. Click **"Email address verification"**
3. Customize the email template (optional)
4. Make sure it's enabled

## Step 4: Create Firestore Database

1. Go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for now)
4. Select your region
5. Click **"Done"**

## Step 5: Set Firestore Security Rules

Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /locations/{document} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to read/write user profiles
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 6: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click **"Web"** icon (`</>`)
4. Register app name: `ConnectUs Location Tracker`
5. **Copy the config object**

## Step 7: Update Your Code

Replace the config in `src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## Step 8: Configure Email Settings (Optional)

1. Go to **Authentication → Templates**
2. Customize email templates:
   - **Email address verification**
   - **Password reset**
3. Add your domain to **Authorized domains** if deploying

## Step 9: Test the Setup

1. Run your app: `npm start`
2. Try registering a new account
3. Check your email for verification
4. Try logging in after verification
5. Test forgot password functionality

## Step 10: Production Security Rules

When ready for production, update Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /locations/{document} {
      allow read, write: if request.auth != null 
        && request.auth.token.email_verified == true;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId 
        && request.auth.token.email_verified == true;
    }
  }
}
```

## 🚨 Important Notes:

- **Email verification is REQUIRED** - users cannot login without verifying email
- **Check spam folder** - verification emails might go to spam
- **Use real email** when testing - you need to receive the verification email
- **Firebase hosting** provides HTTPS automatically (required for location services)

## 🔧 Troubleshooting:

**"Firebase not configured" error:**
- Make sure you replaced the config with your actual Firebase config

**"Email not verified" error:**
- Check email inbox and spam folder
- Click the verification link in the email

**Location not working:**
- Make sure you're using HTTPS (required for geolocation)
- Allow location permissions in browser

**Authentication errors:**
- Check Firebase console for error logs
- Ensure email/password is enabled in Authentication settings

## 🚀 Ready to Deploy?

1. Build the app: `npm run build`
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Login: `firebase login`
4. Initialize: `firebase init hosting`
5. Deploy: `firebase deploy`

Your app will be available at: `https://your-project.web.app`