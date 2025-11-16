# PromptForge Database Migration Guide

**Migration File**: `supabase/migrations/20250116000000_create_promptforge_tables.sql`  
**Status**: Ready to apply (manual application required due to conflicts)

---

## ⚠️ Important Note

The migration conflicts with existing functions (`match_document_chunks`). You have two options:

### Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/sql
2. Open the SQL Editor
3. Copy the contents of `supabase/migrations/20250116000000_create_promptforge_tables.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute

**Note**: The migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to run even if some tables exist.

### Option 2: Apply Specific Tables Only

If you want to avoid conflicts, you can apply tables individually:

```sql
-- Just the PromptForge tables (skip workspace if not needed)
CREATE TABLE IF NOT EXISTS prompts (...);
CREATE TABLE IF NOT EXISTS prompt_versions (...);
CREATE TABLE IF NOT EXISTS executions (...);
CREATE TABLE IF NOT EXISTS packs (...);
CREATE TABLE IF NOT EXISTS pack_prompts (...);
```

---

## 📋 Tables Created

1. **workspaces** - Multi-tenant workspace support
2. **workspace_members** - Team collaboration
3. **prompts** - Main prompt entity
4. **prompt_versions** - Version control
5. **executions** - Execution tracking
6. **packs** - Prompt collections
7. **pack_prompts** - Many-to-many relationship

---

## ✅ Verification

After applying, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('prompts', 'prompt_versions', 'executions', 'packs');
```

---

## 🔒 Security

All tables have RLS enabled with appropriate policies:
- Users can only see their own prompts (unless public/team)
- Users can only create executions for themselves
- Workspace members can see team prompts

---

**Ready to apply!** Use Option 1 (Dashboard) for easiest application.
