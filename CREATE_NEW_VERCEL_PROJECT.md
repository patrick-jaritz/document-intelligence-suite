# Create New Vercel Project

## Steps to Create Fresh Project

### Step 1: Create New Project in Vercel

1. Go to: https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Find and select: `patrick-jaritz/document-intelligence-suite`
5. Click **"Import"**

### Step 2: Configure Project Settings

When configuring the new project:

**Framework Preset:** 
- Select **"Other"** or **"Vite"** (if available)

**Root Directory:**
- Leave as **"."** (root) or set to **"frontend"** if you want to deploy just frontend

**Build Command:**
- Set to: `cd frontend && npm install && npm run build`

**Output Directory:**
- Set to: `frontend/dist`

**Install Command:**
- Leave as: `npm install` (or `cd frontend && npm install` if root is frontend)

### Step 3: Environment Variables

Before deploying, add your environment variables:

1. In project settings → **Environment Variables**
2. Add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - (Or use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will:
   - Clone the repo
   - Install dependencies
   - Build using your config
   - Deploy

### Step 5: Set Production Branch (Optional)

1. After first deployment, go to **Settings** → **Git**
2. Set **Production Branch** to `main` (if not already)
3. Enable **Auto-deploy**

## What This Fixes

✅ Fresh project = fresh webhook (will be created automatically)
✅ Clean configuration
✅ Auto-deploy should work from the start
✅ No stuck state from old project

## After Creating New Project

- The old project can be deleted or left alone
- Update any custom domains to point to the new project
- The new project will have a new URL (or you can add your custom domain)

## Quick Reference

**Build Command:** `cd frontend && npm install && npm run build`
**Output Directory:** `frontend/dist`
**Root Directory:** `.` (or `frontend` if you prefer)
