# Why Vercel Stopped Auto-Deploying

## Common Reasons This Happens

### 1. **GitHub Webhook Delivery Failure**
- GitHub webhooks can silently fail
- Check: https://github.com/patrick-jaritz/document-intelligence-suite/settings/hooks
- Look for red X marks or failed deliveries

### 2. **Branch Protection Changes**
- If branch protection was added, webhooks might be blocked
- Check: GitHub → Settings → Branches

### 3. **Vercel Webhook Rate Limiting**
- Too many deployments might trigger rate limits
- Vercel might temporarily disable auto-deploy

### 4. **GitHub App Permissions Changed**
- If you're using GitHub App (not OAuth), permissions might have changed
- Check: GitHub → Settings → Applications → Authorized OAuth Apps

### 5. **Repository Access Token Expired**
- Vercel's access token might have expired
- Reconnecting GitHub should fix this (but you already tried)

## Most Likely Cause

**GitHub webhook is not delivering events to Vercel.**

## How to Check

1. Go to: https://github.com/patrick-jaritz/document-intelligence-suite/settings/hooks
2. Find the Vercel webhook (should show vercel.com URL)
3. Click on it
4. Check "Recent Deliveries" tab
5. Look for recent push events - are they:
   - ✅ Green (200 OK)?
   - ❌ Red (failed)?
   - ⚠️ Missing (no recent deliveries)?

## Quick Fix

Since auto-deploy isn't working, let's use **Deploy Hooks** to manually trigger:

1. In Vercel → Settings → Git
2. Scroll to "Deploy Hooks" section
3. Create a new hook for branch: `cursor/analyze-project-structure-and-health-ddb7`
4. Copy the hook URL
5. Use it to trigger deployments manually when needed

Or change Production Branch to `main` - that might trigger immediately.
