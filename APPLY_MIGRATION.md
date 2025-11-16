# Apply PromptForge Database Migration

## Quick Steps

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open the file: `supabase/migrations/20251116000000_create_promptforge_system.sql`
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click **Run** (or press Ctrl/Cmd + Enter)
8. Verify success message

### Option 2: Supabase CLI

```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## Verification

After running the migration, verify tables were created:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see these new tables:
   - `prompts`
   - `prompt_versions`
   - `executions`
   - `executions_data`
   - `prompt_packs`
   - `pack_prompts`
   - `prompt_metrics`
   - `prompt_favorites`
   - `prompt_likes`

## Troubleshooting

### Error: "relation already exists"
- Some tables might already exist from previous migrations
- The migration uses `CREATE TABLE IF NOT EXISTS`, so this should be safe
- Check if tables exist and have correct schema

### Error: "permission denied"
- Make sure you're using the service role key or have proper permissions
- Check RLS policies are enabled

### Migration succeeds but tables not visible
- Refresh the Supabase dashboard
- Check you're looking at the correct project
- Verify you have read permissions

## Next Steps

After migration:
1. Deploy Edge Functions (see `deploy-promptforge.sh`)
2. Set environment variables
3. Test the system at `/prompts`
