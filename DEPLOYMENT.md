# 🚀 Deployment Guide

## Quick Deploy Steps

### 1. GitHub Upload (2 minutes)
```bash
cd location-tracker
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/location-tracker.git
git push -u origin main
```

### 2. Deploy on Vercel (1 minute)
1. Go to **vercel.com**
2. Sign in with GitHub
3. Import `location-tracker` repository
4. Click Deploy
5. Get URL: `https://location-tracker-xyz.vercel.app`

### 3. Firebase Setup (2 minutes)
1. **Firebase Console** → Your project
2. **Database Rules**:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```
3. **Authentication** → Enable Google Sign-in

## ✅ Ready Features
- Real-time location tracking
- Group management
- Lagging alerts with notifications
- Admin controls (distance settings, member requests)
- Emergency alerts
- Demo mode
- Mobile responsive

## 📱 Test with Friends
Share your live URL and test:
- Group creation/joining
- Location tracking
- Distance calculations
- Lagging alerts
- Emergency notifications

**Total setup time: ~5 minutes**