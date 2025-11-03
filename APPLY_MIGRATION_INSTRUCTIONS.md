# Apply Prompt Builder Migration

## Quick Instructions

The Edge Functions are deployed, but the database migration needs to be applied manually.

### Method 1: Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/sql/new

2. Copy the entire contents of:
   ```
   supabase/migrations/20250131000000_add_prompt_templates.sql
   ```

3. Paste into SQL Editor

4. Click "Run"

5. Verify success ✅

### Method 2: Supabase CLI

If you have database access configured:

```bash
supabase db push
```

Or link and push:
```bash
supabase link --project-ref joqnpibrfzqflyogrkht
supabase db push
```

---

## What This Migration Does

1. Creates `prompt_templates` table for storing prompts
2. Adds `prompt_template_id` column to `structure_templates`
3. Sets up Row Level Security (RLS) policies
4. Creates performance indexes
5. Adds triggers for `updated_at` timestamp

---

## Verify Migration

After applying, verify the table exists:

```sql
-- Check table exists
SELECT * FROM prompt_templates LIMIT 1;

-- Check column added
SELECT prompt_template_id FROM structure_templates LIMIT 1;
```

Both should return without errors.

---

**Once migration is applied, the Prompt Builder is fully operational!** 🚀

