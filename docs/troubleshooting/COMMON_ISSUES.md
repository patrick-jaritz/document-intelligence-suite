# Common Issues

## Dependencies Not Installing

**Problem:** npm install fails

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## Build Fails

**Problem:** npm run build fails

**Solution:**
1. Check TypeScript errors: `npm run typecheck`
2. Check for missing dependencies
3. Clear cache and rebuild

## Dev Server Won't Start

**Problem:** npm run dev fails

**Solution:**
1. Check port 5173 is not in use
2. Verify environment variables
3. Check Vite configuration

## Supabase Connection Issues

**Problem:** Cannot connect to Supabase

**Solution:**
1. Verify VITE_SUPABASE_URL is set
2. Verify VITE_SUPABASE_ANON_KEY is set
3. Check Supabase project status

## For More Help
- See [Comprehensive Fix Plan](../../COMPREHENSIVE_FIX_PLAN.md)
- Check [Health Status](../../QUICK_HEALTH_CHECK.md)
