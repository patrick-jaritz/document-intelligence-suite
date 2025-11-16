# Create GitHub Webhook for Vercel

## The Problem
Vercel isn't creating the GitHub webhook automatically, so auto-deploy doesn't work.

## Solution: Create Webhook Manually

### Step 1: Get Your Vercel Webhook URL

1. Go to: https://vercel.com/dashboard
2. Click on your project
3. Go to **Settings** → **Git**
4. Look for webhook information or integration details
5. OR check if there's a webhook URL shown anywhere

**Alternative:** The webhook URL format is usually:
```
https://api.vercel.com/v1/integrations/deploy-hooks/[hook-id]
```

But we need the actual webhook endpoint that Vercel expects from GitHub.

### Step 2: Create Webhook in GitHub

1. Go to: https://github.com/patrick-jaritz/document-intelligence-suite/settings/hooks
2. Click **"Add webhook"**
3. You'll need:
   - **Payload URL**: Vercel's webhook endpoint (we need to find this)
   - **Content type**: `application/json`
   - **Events**: Select "Just the push event" or "Let me select individual events" → check "Pushes"
   - **Active**: Checked

### Step 3: Find Vercel Webhook URL

**Option A: Check Vercel Integration**
- In Vercel → Settings → Git
- Look for any webhook URL or integration details
- Sometimes it shows the webhook endpoint

**Option B: Check Vercel API**
- Vercel might expose webhook endpoints via their API
- But this requires authentication

**Option C: Reconnect GitHub Integration Properly**
- Disconnect GitHub completely
- Reconnect it
- This SHOULD create the webhook automatically
- If it doesn't, there might be a permissions issue

## Most Likely Fix

**The GitHub integration might not have proper permissions.**

Try this:
1. Go to GitHub → Settings → Applications → Authorized OAuth Apps
2. Find "Vercel" 
3. Check if it has access to your repository
4. If not, revoke and re-authorize
5. Then go back to Vercel and reconnect GitHub

This should trigger Vercel to create the webhook properly.
