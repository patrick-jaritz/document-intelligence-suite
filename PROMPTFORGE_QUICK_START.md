# PromptForge Quick Start Guide

**Get PromptForge up and running in 5 minutes!**

---

## 🚀 Step 1: Apply Database Migration

### Via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/sql
2. Click "New Query"
3. Copy entire contents of: `supabase/migrations/20250116000000_create_promptforge_tables.sql`
4. Paste into SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)

**That's it!** Tables will be created automatically.

---

## ✅ Step 2: Verify Installation

### Check Tables Exist
Run in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('prompts', 'prompt_versions', 'executions', 'packs')
ORDER BY table_name;
```

Should return 4 rows (or more if workspaces are created).

---

## 🎯 Step 3: Start Using PromptForge

### Access PromptForge
1. Open your app
2. Click **"PromptForge"** button in mode selector
3. Or navigate to: `/prompts`

### Create Your First Prompt
1. Click **"New Prompt"** or **"Create New Prompt"**
2. Fill in:
   - Title: "My First Prompt"
   - Description: "A test prompt"
   - Category: "Testing"
   - Tags: "test, example"
3. Build your prompt using the structured builder
4. Click **"Create"**

### Execute a Prompt
1. Open any prompt
2. Click **"Execute"** button
3. Fill in parameters (if any)
4. Select model (e.g., GPT-4o Mini)
5. Click **"Execute Prompt"**
6. View response and provide feedback

---

## 📚 Key Features

### Library (`/prompts`)
- Browse all your prompts
- Search by title/description
- Filter by tags/categories
- Sort by date, usage, success rate
- Quick actions: Edit, Duplicate, Archive, Delete

### Editor (`/prompts/edit?id=...`)
- Edit prompt metadata
- Build structured prompts
- Create versions
- Execute prompts
- View history

### Version Control
- Every save creates a version
- View all versions
- Promote any version to current
- Track changelogs

### Execution
- Extract parameters from `{{placeholders}}`
- Run with multiple LLM providers
- Collect feedback
- Track performance

---

## 🔧 Troubleshooting

### Tables Don't Exist
- Check migration was applied
- Verify in Supabase Dashboard → Database → Tables

### Can't Create Prompts
- Check you're logged in
- Verify RLS policies are active
- Check browser console for errors

### Execution Fails
- Verify `execute-prompt` function is deployed
- Check API keys are configured in Supabase
- Check browser console for errors

### Prompts Not Showing
- Check filters aren't hiding them
- Verify prompts aren't archived
- Check visibility settings

---

## 📖 Documentation

- **Full Spec**: See product spec document
- **Implementation Plan**: `PROMPTFORGE_IMPLEMENTATION_PLAN.md`
- **Phase 2 Complete**: `PROMPTFORGE_PHASE2_COMPLETE.md`
- **Migration Guide**: `PROMPTFORGE_MIGRATION_GUIDE.md`

---

## 🎉 You're Ready!

PromptForge is now fully functional. Start creating and managing your prompts!

**Next Steps:**
1. Create a few test prompts
2. Execute them with different parameters
3. Create versions and test versioning
4. Explore the library features

**Happy Prompt Engineering!** 🚀
