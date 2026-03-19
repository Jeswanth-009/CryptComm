# CryptComm Deployment Guide

This guide covers deploying CryptComm with the frontend on Vercel and backend on Render.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Render account (free tier works)
- Git installed locally

## Step 1: Push to GitHub

1. **Create a new repository on GitHub** (do not initialize with README)
   - Go to https://github.com/new
   - Name it `cryptcomm` (or your preferred name)
   - Keep it public or private
   - Do NOT add README, .gitignore, or license

2. **Push your local code to GitHub**

```bash
cd C:\CryptComm

# Add all files
git add .

# Commit
git commit -m "Initial commit: CryptComm with timed rooms"

# Add your GitHub repo as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/cryptcomm.git

# Push to GitHub
git push -u origin main
```

If you're on `master` branch instead of `main`:
```bash
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Render

1. **Go to Render** (https://render.com/)
   - Sign up or log in with your GitHub account
   - Click "New +" → "Web Service"
   - Select "Build and deploy from a Git repository"
   - Click "Connect" next to your `cryptcomm` repository (you may need to configure GitHub access)

2. **Configure the Web Service**
   - **Name**: `cryptcomm-backend` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., Oregon)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Plan**: `Free`

3. **Add Environment Variables**
   - Scroll to "Environment Variables" section
   - Add the following:
     ```
     PORT=3001
     NODE_ENV=production
     CORS_ORIGIN=* (we'll update this after Vercel deployment)
     ```

4. **Configure Health Check**
   - Scroll to "Health & Alerts" section
   - Set **Health Check Path**: `/health`
   - This ensures Render monitors your service properly

5. **Deploy and Get URL**
   - Click "Create Web Service"
   - Wait for deployment to complete (first deploy takes 3-5 minutes)
   - Find your backend URL: `https://cryptcomm-backend.onrender.com` (or your custom name)
   - Test health endpoint: `https://cryptcomm-backend.onrender.com/health`
   - Note your WebSocket URL: `wss://cryptcomm-backend.onrender.com`

> **Important**: Render's free tier spins down after 15 minutes of inactivity. See the "Keep Backend Alive" section below for a solution.

## Step 3: Deploy Frontend to Vercel

1. **Go to Vercel** (https://vercel.com/)
   - Sign up or log in
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select the repository you just created

2. **Configure the Project**
   - Framework Preset: **Next.js** (should auto-detect)
   - Root Directory: Click "Edit" → Select `frontend`
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

3. **Add Environment Variables**
   - Expand "Environment Variables" section
   - Add:
     ```
     Name: NEXT_PUBLIC_WS_URL
     Value: wss://cryptcomm-backend.onrender.com
     ```
   - Replace `cryptcomm-backend.onrender.com` with your actual Render backend URL

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment (usually 1-2 minutes)
   - You'll get a URL like: `https://your-app.vercel.app`

## Step 4: Update CORS Configuration

1. **Go back to Render**
   - Open your backend service dashboard
   - Go to "Environment" tab
   - Update `CORS_ORIGIN` to your Vercel URL:
     ```
     CORS_ORIGIN=https://your-app.vercel.app
     ```
   - If you have a custom domain, use that instead
   - Click "Save Changes" (Render will auto-redeploy)

## Step 5: Test Your Deployment

1. **Open your Vercel URL** in a browser: `https://your-app.vercel.app`

2. **Test the application:**
   - Enter a username and connect
   - Create a room (select a duration)
   - Send messages
   - Try with multiple browser tabs/windows

3. **Check backend health:**
   - Visit: `https://cryptcomm-backend.onrender.com/health`
   - Should return JSON with status

## Step 6: Keep Backend Alive (Free Tier)

Render's free tier spins down after 15 minutes of inactivity. To keep your backend running:

1. **Go to Cron-job.org** (https://cron-job.org/)
   - Sign up for a free account
   - No credit card required

2. **Create a Cron Job**
   - Click "Create cronjob"
   - **Title**: `CryptComm Backend Keep Alive`
   - **URL**: `https://cryptcomm-backend.onrender.com/health`
   - Replace with your actual Render URL
   - **Schedule**: Select "Every 5 minutes" or "Every 10 minutes"
     - **Recommended**: Every 5 minutes (more reliable)
     - Alternatively: Every 10 minutes (less frequent)
   - **Enable**: Turn on the job
   - Click "Create"

3. **Verify the Cron Job**
   - The cron job will ping your backend every 5-10 minutes
   - This prevents Render from spinning down due to inactivity
   - Your backend will stay active and respond faster
   - Check the "History" tab on cron-job.org to see successful pings

> **Note**: While this keeps your backend alive, the first request after a spin-down (if any) may still take 30-60 seconds. The cron job minimizes this by keeping the service active.

## Custom Domains (Optional)

### Vercel Custom Domain
1. Go to your Vercel project → Settings → Domains
2. Add your custom domain (e.g., `cryptcomm.yourdomain.com`)
3. Follow DNS configuration instructions
4. Update Render `CORS_ORIGIN` to your custom domain

### Render Custom Domain
1. Go to Render service → Settings → Custom Domain
2. Add custom domain
3. Configure DNS records (CNAME or A record)
4. Update Vercel environment variable `NEXT_PUBLIC_WS_URL` to use your custom domain with `wss://` protocol

## Environment Variables Reference

### Frontend (Vercel)
- `NEXT_PUBLIC_WS_URL`: WebSocket server URL (format: `wss://your-backend-domain`)

### Backend (Render)
- `PORT`: Port number (default: 3001)
- `NODE_ENV`: Environment (production)
- `CORS_ORIGIN`: Allowed frontend origin (format: `https://your-frontend-domain`)

## Troubleshooting

### WebSocket Connection Failed
- Check `NEXT_PUBLIC_WS_URL` in Vercel environment variables
- Ensure it uses `wss://` (not `ws://`)
- Verify Render backend is running: check `/health` endpoint
- If backend is spinning down, set up the cron job (see Step 6)

### CORS Errors
- Verify `CORS_ORIGIN` in Render matches your exact Vercel URL
- Include protocol (`https://`) and no trailing slash
- Redeploy Render after changing environment variables

### Build Failures

**Vercel:**
- Check build logs in Vercel dashboard
- Ensure `frontend` root directory is set
- Verify all dependencies are in `frontend/package.json`

**Render:**
- Check deployment logs in Render dashboard
- Ensure `backend` root directory is set
- Verify `dist/` folder is being created by TypeScript build

### Messages Not Sending/Receiving
- Open browser DevTools → Console
- Check for WebSocket connection status
- Verify encryption keys are being generated
- Test with `/health` endpoint to ensure backend is responsive

### Backend Spinning Down (Free Tier)
- Set up a cron job on cron-job.org to ping your backend every 5-10 minutes
- See "Step 6: Keep Backend Alive" section above

## Continuous Deployment

Both Vercel and Render automatically deploy on git push:

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```
3. Vercel and Render will automatically build and deploy

## Monitoring

### Vercel
- Dashboard shows: deployments, analytics, errors
- View logs: Project → Deployments → Select deployment → View Function Logs

### Render
- Dashboard shows: deployments, metrics, logs
- View logs: Service → Logs tab
- Monitor resource usage and events in the dashboard

## Costs

### Free Tier Limits (as of 2026)
- **Vercel**: 100 GB bandwidth, unlimited deployments
- **Render**: 750 hours/month free (equivalent to one always-on service), but services spin down after 15 minutes of inactivity

For production with high traffic, consider upgrading to paid plans.

## Security Recommendations

1. **Use Environment Variables**: Never commit `.env` files
2. **Enable HTTPS**: Both platforms provide SSL/TLS by default
3. **Restrict CORS**: Set specific origin, not `*`
4. **Rate Limiting**: Already implemented in backend
5. **Custom Domains**: Use your own domain with proper SSL certificates

## Scaling

### Horizontal Scaling
- Render: Upgrade to paid plan for multiple instances
- Vercel: Automatically scales based on traffic

### Vertical Scaling
- Render: Upgrade to higher-tier plan for more resources (Starter, Standard, Pro plans)

## Backup Strategy

- **Code**: Backed up in GitHub
- **Data**: Currently in-memory only; for persistence, add a database (Redis, PostgreSQL) and update backend to persist rooms/users

---

## Quick Reference Commands

```bash
# Push updates to GitHub
git add .
git commit -m "Update description"
git push

# Trigger manual deploy on Vercel (if Vercel CLI installed)
vercel --prod

# View Render logs (via dashboard - no CLI needed for basic operations)
# Visit: https://dashboard.render.com → Select your service → Logs tab
```

## Support

- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Cron-job.org Help: https://cron-job.org/en/documentation/
- GitHub Issues: Create an issue in your repository

---

**Need help?** Open an issue in the GitHub repository with:
- Deployment platform (Vercel/Railway)
- Error message or screenshot
- Steps to reproduce
