# Deployment Guide: Making Your Website Live Online

This guide will help you deploy your Student Projects website so it's accessible online.

## 🎯 Recommended Option: Netlify (Easiest & Free)

### Prerequisites
- A GitHub account
- Your Supabase database already set up and working

---

## Step-by-Step Deployment with Netlify

### Step 1: Prepare Your Files

1. Make sure all your files are in the `Website/` folder
2. Your folder should contain:
   - `index.html`
   - `config.js`
   - `env.js`
   - `static/` folder with all JS and CSS files

### Step 2: Push to GitHub

```bash
# Navigate to your project folder
cd /Users/nathanpottier/student-projects-app

# Add all files
git add .

# Commit your changes
git commit -m "Ready for deployment"

# Push to GitHub
git push origin main
```

### Step 3: Deploy to Netlify

1. **Go to [Netlify](https://www.netlify.com)**
   - Click "Sign up" (use your GitHub account)

2. **Import Your Project**
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub"
   - Select your `student-projects-app` repository

3. **Configure Build Settings**
   - Base directory: `Website`
   - Build command: (leave empty - it's a static site)
   - Publish directory: `.` or `Website`
   - Click "Deploy site"

4. **Set Environment Variables** (Important!)
   - Go to Site settings → Environment variables
   - Add these variables:
     ```
     SUPABASE_URL=your-supabase-project-url
     SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
   - Get these from your Supabase project dashboard

5. **Update Your env.js**
   
   Before deploying, update `Website/env.js` to use production values:
   
   ```javascript
   window.ENV = {
     SUPABASE_URL: 'https://your-project.supabase.co',
     SUPABASE_ANON_KEY: 'your-anon-key-here',
     PROJECTS_TABLE: 'projects'
   };
   ```

6. **Redeploy**
   - After updating env.js, push to GitHub again
   - Netlify will automatically redeploy

7. **Get Your URL**
   - Netlify will give you a URL like: `https://your-site-name.netlify.app`
   - You can customize this in Site settings → Domain management

---

## Alternative Option: Vercel (Also Easy & Free)

### Steps:

1. **Go to [Vercel](https://vercel.com)**
2. **Import Git Repository**
   - Click "Add New" → "Project"
   - Select your GitHub repository
3. **Configure**
   - Root Directory: `Website`
   - Framework Preset: Other
4. **Add Environment Variables**
   - Same as Netlify (SUPABASE_URL, SUPABASE_ANON_KEY)
5. **Deploy**
6. **Get Your URL**: `https://your-project.vercel.app`

---

## Alternative Option: GitHub Pages (Free but requires setup)

### Steps:

1. **Create a separate branch for deployment**
   ```bash
   git checkout -b gh-pages
   ```

2. **Move Website files to root**
   ```bash
   mv Website/* .
   ```

3. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

4. **Enable GitHub Pages**
   - Go to your repo on GitHub
   - Settings → Pages
   - Source: `gh-pages` branch
   - Save

5. **Your site will be at**: `https://yourusername.github.io/student-projects-app`

**Note**: You'll still need to update `env.js` with your Supabase credentials.

---

## Important: Security for env.js

### Option A: Use Netlify/Vercel Environment Variables (Recommended)

Update your `env.js` to read from build-time variables:

```javascript
window.ENV = {
  SUPABASE_URL: '${SUPABASE_URL}' || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: '${SUPABASE_ANON_KEY}' || 'your-key',
  PROJECTS_TABLE: 'projects'
};
```

### Option B: Just Use env.js (Simpler but less secure)

Keep your current `env.js` with the credentials. The anon key is meant to be public anyway, so this is actually fine for most cases.

---

## Post-Deployment Checklist

After deploying, test these features:

- ✅ Projects load and display correctly
- ✅ Can create new projects
- ✅ Can upload images and videos
- ✅ Can edit projects
- ✅ Can delete projects
- ✅ Comments work properly
- ✅ All filters work
- ✅ Images zoom in lightbox

---

## Custom Domain (Optional)

### For Netlify:
1. Go to Domain settings
2. Add custom domain
3. Follow DNS configuration instructions
4. Your site will be at `https://yourdomain.com`

### For Vercel:
1. Go to Settings → Domains
2. Add your custom domain
3. Configure DNS records
4. Done!

---

## Troubleshooting

### Problem: "Projects not loading"
- Check Supabase credentials in env.js
- Check browser console for errors
- Verify Supabase RLS policies allow public read access

### Problem: "Can't upload images/videos"
- Check Supabase storage bucket exists (`project-media`)
- Verify storage policies allow uploads
- Check file size limits

### Problem: "Comments not working"
- Verify `comments` table exists in Supabase
- Check RLS policies on comments table
- Check browser console for errors

---

## Recommended: Netlify (Best Choice)

✅ **Easiest to set up**  
✅ **Automatic deployments** from GitHub  
✅ **Free SSL certificate**  
✅ **CDN included**  
✅ **Custom domain support**  
✅ **Great for static sites**  

**Total time: ~10 minutes** ⏱️

---

## Need Help?

Common deployment platforms:
- **Netlify**: https://www.netlify.com (Recommended)
- **Vercel**: https://vercel.com
- **GitHub Pages**: https://pages.github.com
- **Cloudflare Pages**: https://pages.cloudflare.com

All of these are **free** for personal projects! 🎉

