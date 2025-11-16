# Deploy github-analyzer Function - Quick Guide

## ✅ Fix Applied

The variable shadowing bug has been fixed in `supabase/functions/github-analyzer/index.ts`:
- Changed `const repo` to `const repoInfo` to avoid shadowing the function parameter
- Updated return statement to use `repo: repoInfo`

## 🚀 Deployment Instructions

### Quick Deploy (Choose One Method)

#### Method 1: Interactive Login (Recommended)
```bash
# Login to Supabase
npx supabase login

# Deploy the function
npx supabase functions deploy github-analyzer --project-ref joqnpibrfzqflyogrkht
```

#### Method 2: Using Access Token
```bash
# Get your access token from: https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN=your_access_token_here

# Deploy the function
npx supabase functions deploy github-analyzer --project-ref joqnpibrfzqflyogrkht
```

#### Method 3: Using Deployment Script
```bash
# Make script executable (if not already)
chmod +x deploy-github-analyzer.sh

# Run the script
./deploy-github-analyzer.sh
```

## 📋 What Was Fixed

**Error**: `Cannot access 'repo' before initialization`

**Root Cause**: Variable shadowing - the function parameter `repo` was being shadowed by a `const repo` declaration, creating a temporal dead zone error.

**Solution**: 
- Renamed local variable from `repo` to `repoInfo` (line 205)
- Updated return statement to `repo: repoInfo` (line 240)

## ✅ Verification

After deployment, test the function:
```bash
curl -X POST https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/github-analyzer \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/owner/repo"}'
```

## 📊 Monitor Deployment

- **Dashboard**: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/functions
- **Function URL**: https://joqnpibrfzqflyogrkht.supabase.co/functions/v1/github-analyzer

## 🔍 Troubleshooting

If deployment fails:
1. Ensure you're logged in: `npx supabase login`
2. Verify project ref is correct: `joqnpibrfzqflyogrkht`
3. Check function exists: `ls supabase/functions/github-analyzer/`
4. Review logs: Check Supabase dashboard for deployment logs
