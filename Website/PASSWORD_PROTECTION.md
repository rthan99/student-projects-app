# Password Protection System

## 🔒 Overview

The website is now protected with a simple password screen to prevent unauthorized access and bots.

## 🔑 Access Code

**Password**: `NEMOxDelft`

This password must be entered to access the website.

## ⏱️ Session Duration

- Once logged in, the session lasts **24 hours**
- After 24 hours, users will need to enter the password again
- Session is stored in browser's localStorage

## 🎨 Login Screen

Users will see:
- Clean white screen with centered login box
- "DEF Projects" title
- Password input field
- "Access Projects" button
- Error message if password is incorrect

## 🔧 How It Works

1. When users visit the site, `auth.js` checks if they're authenticated
2. If not authenticated (or session expired), shows login screen
3. User enters password
4. If correct: Access granted, session saved for 24 hours
5. If incorrect: Error message shown, input shakes

## 🛠️ For Developers

### To Logout (Testing)
Open browser console and run:
```javascript
logout()
```

### To Change Password
Edit `Website/auth.js` and change:
```javascript
const CORRECT_PASSWORD = 'NEMOxDelft';
```

### To Change Session Duration
Edit `Website/auth.js` and change:
```javascript
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
```

## 🌐 Deployment

The password protection works automatically on:
- ✅ Local development
- ✅ Netlify
- ✅ Vercel
- ✅ GitHub Pages
- ✅ Any static hosting

No server-side configuration needed!

## 🔐 Security Notes

This is a **client-side password** system:
- Good for preventing casual access and bots
- Good for keeping the site semi-private
- NOT suitable for highly sensitive data
- Password is visible in JavaScript (by design for static sites)

For your use case (student projects with public anon key), this is perfectly adequate!

## ✅ Testing

1. Visit your site
2. You should see the login screen
3. Enter: `NEMOxDelft`
4. Click "Access Projects"
5. You're in!

## 📝 Sharing Access

To give someone access, simply share:
- **Website URL**: `https://your-site.vercel.app` (or Netlify URL)
- **Password**: `NEMOxDelft`

They'll be able to access the site for 24 hours after logging in!

