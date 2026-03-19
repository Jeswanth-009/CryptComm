# Quick Render Deployment Setup

This document provides quick instructions for deploying CryptComm backend to Render and setting up a cron job to keep it alive.

## Backend Deployment on Render

1. **Sign up/Login**: Go to https://render.com and connect your GitHub account

2. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Select your repository
   - Configure:
     - **Name**: `cryptcomm-backend`
     - **Region**: Oregon (or closest to you)
     - **Branch**: `main`
     - **Root Directory**: `backend`
     - **Runtime**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm run start`
     - **Plan**: `Free`

3. **Environment Variables**:
   ```
   PORT=3001
   NODE_ENV=production
   CORS_ORIGIN=https://your-vercel-app.vercel.app
   ```

4. **Health Check**:
   - Set **Health Check Path**: `/health`

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment (3-5 minutes)
   - Note your URL: `https://cryptcomm-backend.onrender.com`

## Keep Backend Alive (Cron Job)

Render's free tier spins down after 15 minutes of inactivity. Use cron-job.org to ping your backend regularly:

### Setup on Cron-job.org

1. **Sign up**: Go to https://cron-job.org and create a free account

2. **Create Cron Job**:
   - Click "Create cronjob"
   - **Title**: `CryptComm Backend Keep Alive`
   - **URL**: `https://cryptcomm-backend.onrender.com/health` (use your actual URL)
   - **Schedule**:
     - Select "Every 5 minutes" (recommended)
     - Or "Every 10 minutes" (alternative)
   - **Enable**: Turn on the job
   - Click "Create"

3. **Verify**:
   - Check "History" tab to see successful pings
   - Status code should be 200
   - Your backend will now stay active

### Why This Works

- The cron job pings your `/health` endpoint every 5-10 minutes
- This prevents Render from spinning down due to inactivity
- Your backend stays responsive and users won't experience delays
- The health endpoint is lightweight and doesn't consume much resources

## Alternative Schedule Options

If you want to customize the ping frequency:

- **Every 5 minutes**: Most reliable, keeps backend always warm
- **Every 10 minutes**: Good balance between reliability and requests
- **Every 14 minutes**: Minimum recommended (just before 15-minute timeout)

## Monitoring

### Check Backend Status
- Visit: `https://cryptcomm-backend.onrender.com/health`
- Should return:
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-03-19T...",
    "connections": 0
  }
  ```

### Check Cron Job
- Login to cron-job.org
- View "History" tab
- Verify successful pings every 5-10 minutes
- Green checkmarks indicate successful requests

## Troubleshooting

### Backend Still Spinning Down
- Check cron job is enabled on cron-job.org
- Verify URL is correct (including `https://`)
- Check cron job history for errors
- Ensure health endpoint responds: test manually in browser

### Cron Job Failing
- Verify backend is deployed and running on Render
- Check `/health` endpoint returns 200 status
- Ensure no firewall/security blocking cron-job.org

## Cost

Both services are free:
- **Render Free Tier**: 750 hours/month (enough for one service)
- **Cron-job.org Free**: Unlimited cron jobs with reasonable limits

## Need Help?

See the full deployment guide in [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.
