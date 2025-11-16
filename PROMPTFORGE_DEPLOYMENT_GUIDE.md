# PromptForge Deployment Guide

## Quick Start

### 1. Apply Database Migration

**Option A: Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20251116000000_create_promptforge_system.sql`
4. Click "Run"

**Option B: Supabase CLI**
```bash
cd /workspace
supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy prompts function
supabase functions deploy prompts

# Deploy execute-prompt function
supabase functions deploy execute-prompt

# Deploy executions function
supabase functions deploy executions
```

### 3. Set Environment Variables

In Supabase Dashboard → Edge Functions → Settings:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Settings → API)

### 4. Test the System

1. Navigate to `/prompts` in your app
2. Click "New Prompt"
3. Create a prompt with placeholders: `Write a blog post about {{topic}}`
4. Save the prompt
5. Go to "Execute" tab
6. Fill in parameters and execute

## Verification Checklist

- [ ] Database migration applied successfully
- [ ] All tables created (check in Supabase Table Editor)
- [ ] Edge Functions deployed
- [ ] Environment variables set
- [ ] Can navigate to `/prompts`
- [ ] Can create a new prompt
- [ ] Can execute a prompt
- [ ] Execution appears in history

## Troubleshooting

### "Unauthorized" errors
- Check that user is logged in
- Verify Supabase auth is configured
- Check Edge Function logs in Supabase dashboard

### "Prompt not found" errors
- Verify RLS policies are set correctly
- Check that prompt belongs to current user

### Execution fails
- Verify API keys are set (stored in localStorage for now)
- Check Edge Function logs for detailed errors
- Verify model name is correct for provider

## Next Steps

After deployment:
1. Test all core flows
2. Add user API key management (settings page)
3. Implement analytics dashboard (Phase 2)
4. Add prompt packs (Phase 3)
