# Setup Vercel Deploy Hook

## Step-by-Step Instructions

### 1. Create Deploy Hook in Vercel

1. Go to: https://vercel.com/dashboard
2. Click on your project: `document-intelligence-suite`
3. Go to **Settings** → **Git**
4. Scroll down to **"Deploy Hooks"** section
5. Click **"Create Hook"** button
6. Fill in:
   - **Name**: `manual-deploy` (or any name you want)
   - **Branch**: `cursor/analyze-project-structure-and-health-ddb7`
   - **Git Ref**: Leave empty (or put `HEAD` to deploy latest)
7. Click **"Create Hook"**
8. **Copy the hook URL** that appears (looks like: `https://api.vercel.com/v1/integrations/deploy/...`)

### 2. Test the Hook

Once you have the hook URL, you can trigger a deployment by:

**Option A: Using curl (in terminal)**
```bash
curl -X POST "YOUR_HOOK_URL_HERE"
```

**Option B: Using a browser**
Just visit the URL in your browser (GET request also works)

**Option C: Using this script**
I can create a script that triggers it for you.

### 3. What Happens Next

- Vercel will immediately start a new deployment
- It will use the latest commit from the specified branch
- You can watch it in the Deployments tab

## Alternative: Use Vercel CLI

If you have Vercel CLI access, you can also deploy directly:

```bash
cd /workspace
vercel login
vercel --prod
```

But the Deploy Hook is easier - just a URL you can call anytime.

---

**Once you create the hook and get the URL, share it with me and I can help you trigger it, or you can just visit the URL in your browser to trigger a deployment.**
