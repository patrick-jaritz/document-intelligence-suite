# Vercel Deployment Troubleshooting

## Issue: Vercel Not Picking Up GitHub Pushes

If Vercel is not automatically deploying when you push to GitHub, try these solutions:

### Solution 1: Manual Redeploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project: `document-intelligence-suite`
3. Click on the latest deployment
4. Click **"Redeploy"** button
5. Select the commit you want to deploy (e.g., `79b79a0`)

### Solution 2: Check GitHub Integration

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Git**
4. Verify:
   - ✅ Repository is connected
   - ✅ Production branch is set to `main`
   - ✅ Auto-deploy is enabled

### Solution 3: Reconnect GitHub Repository

If the integration is broken:

1. Go to **Settings** → **Git**
2. Click **"Disconnect"** (if connected)
3. Click **"Connect Git Repository"**
4. Select `patrick-jaritz/document-intelligence-suite`
5. Configure:
   - Production Branch: `main`
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`

### Solution 4: Trigger via Vercel CLI

If you have Vercel CLI installed and authenticated:

```bash
# Login to Vercel
vercel login

# Deploy from current directory
vercel --prod

# Or force redeploy
vercel --prod --force
```

### Solution 5: Use Vercel API

If you have a Vercel API token:

```bash
# Get token from: https://vercel.com/account/tokens
export VERCEL_TOKEN=your_token_here

# Run the API trigger script
./scripts/trigger-vercel-api.sh
```

### Solution 6: Check GitHub Webhook

1. Go to your GitHub repository
2. Go to **Settings** → **Webhooks**
3. Look for a Vercel webhook
4. Check if it's:
   - ✅ Active
   - ✅ Receiving events
   - ✅ Returning 200 status codes

If webhook is missing or broken:
- Reconnect the repository in Vercel (Solution 3)
- Vercel will recreate the webhook automatically

### Solution 7: Make a Small Change to Trigger

Sometimes making a small change can trigger the webhook:

```bash
# Make a small change
echo "$(date)" >> .vercel-deploy-trigger
git add .vercel-deploy-trigger
git commit -m "chore: Trigger Vercel deployment"
git push origin main
```

## Current Deployment Status

- **Latest Commit**: `79b79a0` - Fix GitHubAnalyzer state setters
- **Branch**: `main`
- **Expected Deployment**: Should auto-deploy within 2-5 minutes of push

## Quick Check Commands

```bash
# Check recent commits
git log --oneline -5

# Check current branch
git branch --show-current

# Check if changes are pushed
git status

# Check Vercel CLI (if installed)
vercel --version
```

## Manual Deployment Steps

If automatic deployment isn't working, you can manually trigger:

1. **Via Dashboard** (Recommended):
   - Go to https://vercel.com/dashboard
   - Find project → Click "Redeploy"

2. **Via CLI**:
   ```bash
   vercel --prod
   ```

3. **Via API**:
   ```bash
   export VERCEL_TOKEN=your_token
   ./scripts/trigger-vercel-api.sh
   ```

## Still Not Working?

If none of these solutions work:

1. Check Vercel status: https://www.vercel-status.com/
2. Check GitHub status: https://www.githubstatus.com/
3. Review Vercel deployment logs in the dashboard
4. Contact Vercel support with:
   - Project name: `document-intelligence-suite`
   - Repository: `patrick-jaritz/document-intelligence-suite`
   - Latest commit: `79b79a0`
