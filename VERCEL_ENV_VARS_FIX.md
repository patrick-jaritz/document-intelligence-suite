# 🔧 Vercel Environment Variables - Fix Required

**Issue:** Supabase integration added `NEXT_PUBLIC_` prefixed variables, but Vite requires `VITE_` prefix.

---

## ❌ Current Variables (Wrong Prefix)

The Supabase-Vercel integration automatically added:
- `NEXT_PUBLIC_SUPABASE_URL` ✅ (correct value, wrong prefix)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ (correct value, wrong prefix)

---

## ✅ Required Variables (Correct Prefix)

Your Vite app needs:
- `VITE_SUPABASE_URL` ❌ (missing)
- `VITE_SUPABASE_ANON_KEY` ❌ (missing)

---

## 🔧 Quick Fix

### Option 1: Add VITE_ Variables (Recommended)

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

2. Add these two new variables:

   **Variable 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: Copy the value from `NEXT_PUBLIC_SUPABASE_URL`
   - Environment: Production, Preview, Development
   - Click **Save**

   **Variable 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: Copy the value from `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Environment: Production, Preview, Development
   - Click **Save**

3. **Redeploy** the application

### Option 2: Update Code to Support Both (Alternative)

If you want to support both prefixes, we can update the code to check for both. However, this is less clean and not recommended.

---

## 📋 Complete Variable List

After adding the VITE_ variables, you should have:

**For Frontend (Vite):**
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`

**For Backend (if needed):**
- ✅ `SUPABASE_URL` (already present)
- ✅ `SUPABASE_ANON_KEY` (already present)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (already present)
- ✅ `SUPABASE_JWT_SECRET` (already present)

**For Database (if needed):**
- ✅ `POSTGRES_URL` (already present)
- ✅ `POSTGRES_PRISMA_URL` (already present)
- ✅ `POSTGRES_URL_NON_POOLING` (already present)
- ✅ `POSTGRES_USER` (already present)
- ✅ `POSTGRES_HOST` (already present)
- ✅ `POSTGRES_PASSWORD` (already present)
- ✅ `POSTGRES_DATABASE` (already present)

---

## 🎯 Quick Action Steps

1. **Open Vercel Dashboard** → Environment Variables
2. **Add** `VITE_SUPABASE_URL` (copy value from `NEXT_PUBLIC_SUPABASE_URL`)
3. **Add** `VITE_SUPABASE_ANON_KEY` (copy value from `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
4. **Redeploy** in Vercel Dashboard → Deployments → Redeploy

---

## ✅ Verification

After adding variables and redeploying:

1. Visit your Vercel deployment URL
2. The app should load (no more Configuration Error screen)
3. Check browser console for any remaining errors

---

**Status:** Need to add `VITE_` prefixed variables  
**Priority:** High - Required for app to function

