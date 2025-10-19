# Live Location Tracker Web App

A React + Firebase web application for real-time location tracking and sharing.

## Features

- 🔐 User Authentication (Login/Signup)
- 📍 Real-time location tracking
- 🗺️ Location history
- 👥 Multi-user support
- 📱 Responsive design

## Setup Instructions

### 1. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Email/Password)
4. Create Firestore Database
5. Copy your Firebase config

### 2. Configure Firebase
1. Open `src/firebase.js`
2. Replace the config with your Firebase project config:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### 3. Install and Run
```bash
npm install
npm start
```

### 4. Firebase Security Rules
Set these rules in Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /locations/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## How to Use

1. **Sign Up/Login**: Create account or login
2. **Start Tracking**: Click "Start Tracking" to begin
3. **View Locations**: See your current location and history
4. **Share**: Other users can see all tracked locations

## Technologies Used

- React.js
- Firebase (Auth + Firestore)
- HTML5 Geolocation API
- CSS3

## Browser Requirements

- Modern browser with geolocation support
- HTTPS required for location access (Firebase hosting provides this)

## Deployment

```bash
npm run build
firebase deploy
```

## Troubleshooting

- **Location not working**: Enable location permissions in browser
- **Firebase errors**: Check console for authentication issues
- **Not updating**: Check internet connection and Firebase rules