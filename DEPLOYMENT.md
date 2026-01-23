# CryptComm Deployment Guide

This guide covers deploying CryptComm with the frontend on Vercel and backend on Railway.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Railway account (free tier works)
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

## Step 2: Deploy Backend to Railway

1. **Go to Railway** (https://railway.app/)
   - Sign up or log in
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub account
   - Select your `cryptcomm` repository

2. **Configure the Backend Service**
   - Railway will auto-detect the monorepo
   - Click on the service → "Settings"
   - Set **Root Directory**: `backend`
   - Set **Build Command**: `npm install && npm run build`
   - Set **Start Command**: `npm run start`

3. **Add Environment Variables**
   - Go to "Variables" tab
   - Add the following:
     ```
     PORT=3001
     NODE_ENV=production
     CORS_ORIGIN=* (we'll update this after Vercel deployment)
     ```

4. **Deploy and Get URL**
   - Click "Deploy"
   - Wait for deployment to complete
   - Find your backend URL: `https://your-app-name.up.railway.app`
   - Test health endpoint: `https://your-app-name.up.railway.app/health`
   - Note your WebSocket URL: `wss://your-app-name.up.railway.app`

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
     Value: wss://your-railway-app.up.railway.app
     ```
   - Replace `your-railway-app.up.railway.app` with your actual Railway backend URL

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment (usually 1-2 minutes)
   - You'll get a URL like: `https://your-app.vercel.app`

## Step 4: Update CORS Configuration

1. **Go back to Railway**
   - Open your backend project
   - Go to "Variables" tab
   - Update `CORS_ORIGIN` to your Vercel URL:
     ```
     CORS_ORIGIN=https://your-app.vercel.app
     ```
   - If you have a custom domain, use that instead
   - Save changes (Railway will auto-redeploy)

## Step 5: Test Your Deployment

1. **Open your Vercel URL** in a browser: `https://your-app.vercel.app`

2. **Test the application:**
   - Enter a username and connect
   - Create a room (select a duration)
   - Send messages
   - Try with multiple browser tabs/windows

3. **Check backend health:**
   - Visit: `https://your-railway-app.up.railway.app/health`
   - Should return JSON with status

## Custom Domains (Optional)

### Vercel Custom Domain
1. Go to your Vercel project → Settings → Domains
2. Add your custom domain (e.g., `cryptcomm.yourdomain.com`)
3. Follow DNS configuration instructions
4. Update Railway `CORS_ORIGIN` to your custom domain

### Railway Custom Domain
1. Go to Railway project → Settings → Domains
2. Add custom domain
3. Configure DNS records
4. Update Vercel environment variable `NEXT_PUBLIC_WS_URL` to use your custom domain with `wss://` protocol

## Environment Variables Reference

### Frontend (Vercel)
- `NEXT_PUBLIC_WS_URL`: WebSocket server URL (format: `wss://your-backend-domain`)

### Backend (Railway)
- `PORT`: Port number (default: 3001)
- `NODE_ENV`: Environment (production)
- `CORS_ORIGIN`: Allowed frontend origin (format: `https://your-frontend-domain`)

## Troubleshooting

### WebSocket Connection Failed
- Check `NEXT_PUBLIC_WS_URL` in Vercel environment variables
- Ensure it uses `wss://` (not `ws://`)
- Verify Railway backend is running: check `/health` endpoint

### CORS Errors
- Verify `CORS_ORIGIN` in Railway matches your exact Vercel URL
- Include protocol (`https://`) and no trailing slash
- Redeploy Railway after changing environment variables

### Build Failures

**Vercel:**
- Check build logs in Vercel dashboard
- Ensure `frontend` root directory is set
- Verify all dependencies are in `frontend/package.json`

**Railway:**
- Check deployment logs in Railway dashboard
- Ensure `backend` root directory is set
- Verify `dist/` folder is being created by TypeScript build

### Messages Not Sending/Receiving
- Open browser DevTools → Console
- Check for WebSocket connection status
- Verify encryption keys are being generated
- Test with `/health` endpoint to ensure backend is responsive

## Continuous Deployment

Both Vercel and Railway automatically deploy on git push:

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```
3. Vercel and Railway will automatically build and deploy

## Monitoring

### Vercel
- Dashboard shows: deployments, analytics, errors
- View logs: Project → Deployments → Select deployment → View Function Logs

### Railway
- Dashboard shows: deployments, metrics, logs
- View logs: Project → Deployments → View Logs
- Monitor resource usage in Metrics tab

## Costs

### Free Tier Limits (as of 2026)
- **Vercel**: 100 GB bandwidth, unlimited deployments
- **Railway**: $5 free credit/month, ~500 hours execution time

For production with high traffic, consider upgrading to paid plans.

## Security Recommendations

1. **Use Environment Variables**: Never commit `.env` files
2. **Enable HTTPS**: Both platforms provide SSL/TLS by default
3. **Restrict CORS**: Set specific origin, not `*`
4. **Rate Limiting**: Already implemented in backend
5. **Custom Domains**: Use your own domain with proper SSL certificates

## Scaling

### Horizontal Scaling
- Railway: Increase replicas in service settings
- Vercel: Automatically scales based on traffic

### Vertical Scaling
- Railway: Upgrade to higher-tier plan for more resources

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

# Check Vercel deployment status
vercel --prod

# Check Railway deployment status (if Railway CLI installed)
railway status

# View Railway logs (if Railway CLI installed)
railway logs
```

## Support

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app/
- GitHub Issues: Create an issue in your repository

---

**Need help?** Open an issue in the GitHub repository with:
- Deployment platform (Vercel/Railway)
- Error message or screenshot
- Steps to reproduce
