# How to Get Supabase Environment Variables

## Step-by-Step Instructions

### Step 1: Go to Your Supabase Project

1. Go to: https://supabase.com/dashboard
2. Sign in to your account
3. Select your project (looks like it might be `joqnpibrfzqflyogrkht` based on the code)

### Step 2: Get the Project URL

1. In your Supabase project dashboard
2. Go to **Settings** → **API** (or **Project Settings** → **API**)
3. Look for **"Project URL"** or **"API URL"**
4. Copy this value - this is your `VITE_SUPABASE_URL`
   - Should look like: `https://joqnpibrfzqflyogrkht.supabase.co`

### Step 3: Get the Anon Key

1. Still in **Settings** → **API**
2. Look for **"Project API keys"** section
3. Find **"anon"** or **"anon public"** key
4. Click **"Reveal"** or **"Show"** to see the full key
5. Copy this value - this is your `VITE_SUPABASE_ANON_KEY`
   - Should start with: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 4: Add to Vercel

1. In Vercel Dashboard → Your New Project → **Settings** → **Environment Variables**
2. Click **"Add"** or **"Add Environment Variable"**
3. Add first variable:
   - **Key:** `VITE_SUPABASE_URL`
   - **Value:** Your Supabase project URL
   - **Environment:** Select all (Production, Preview, Development)
4. Click **"Save"**
5. Add second variable:
   - **Key:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anon key
   - **Environment:** Select all (Production, Preview, Development)
6. Click **"Save"**

## Quick Reference

**Where to find:**
- Supabase Dashboard → Your Project → Settings → API

**What you need:**
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon/public key

**Security Note:**
- The anon key is safe to use in frontend code (it's public)
- It's restricted by Row Level Security (RLS) policies
- Never share your service_role key (that's secret!)

## Alternative: Check Existing Vercel Project

If you have the old Vercel project still:
1. Go to old project → Settings → Environment Variables
2. Copy the values from there
3. Add them to the new project
