# Google Drive Integration - On-Call Runbook

**Document:** On-Call Support Procedures  
**Audience:** DevOps, Backend Engineers, On-Call Team  
**Last Updated:** November 17, 2025  
**Response Time:** Critical issues - 5 minutes, High - 15 minutes

---

## Quick Escalation Tree

```
🔴 CRITICAL (Page immediately)
├─ OAuth success rate <95% for >5 min
├─ Google connector error rate >5% for >10 min
├─ Vision RAG response time p95 >5s for >5 min
├─ Database connection failures >2% for >2 min
└─ Emergency: Disable Google features & alert team

🟡 HIGH (Notify team, check within 15 min)
├─ Token refresh failures >10% for >30 min
├─ Google connector latency p95 >1s for >15 min
├─ Elevated memory usage >500MB for >10 min
└─ Service degradation detected

🟢 MEDIUM (Create ticket, resolve within 4 hours)
├─ Unusual API usage patterns
├─ Token expiration warnings
├─ Error pattern changes
└─ Performance optimization opportunities
```

---

## Issue: OAuth Flow Failures

### Symptoms
- Users cannot complete Google login
- "Invalid state parameter" errors in logs
- High error rate in google-oauth-callback

### Step 1: Immediate Check (2 min)

```bash
# Check function status
curl -s https://your-supabase.supabase.co/functions/v1/google-oauth-start \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Accept: application/json"

# Check logs
supabase functions logs google-oauth-callback --project-id $PROJECT_ID --tail
```

### Step 2: Assess Scope (1 min)

- [ ] All users affected or specific region/browser?
- [ ] Started suddenly or gradual degradation?
- [ ] Any recent changes to Google Cloud Console?
- [ ] Any Supabase maintenance notifications?

### Step 3: Investigation (5 min)

**If error: "Invalid state parameter"**
```
Likely cause: Session/CSRF validation failed
Action:
1. Check Supabase Edge Function environment variables
   - GOOGLE_CLIENT_ID set correctly? ✓
   - GOOGLE_CLIENT_SECRET present? ✓
2. Verify redirect URI matches exactly:
   - In code: /functions/v1/google-oauth-callback
   - In Google Cloud Console: Must be identical
3. Check for recent code deployments that modified OAuth logic
4. If recent change: Consider rollback
```

**If error: "Token exchange failed" (401/403)**
```
Likely cause: Invalid Google credentials
Action:
1. Log into Google Cloud Console
2. Verify OAuth client still exists and enabled
3. Check if API quota exceeded: APIs & Services > Quotas
4. Verify client ID/secret haven't been rotated/revoked
5. If credentials changed: Update in Supabase dashboard
```

**If error: "Redirect URI mismatch"**
```
Likely cause: URL configuration mismatch
Action:
1. Get actual redirect URL from logs
2. Go to Google Cloud Console > Credentials
3. Edit OAuth client > Authorized redirect URIs
4. Add/fix redirect URI to exact match
5. Save and test OAuth flow again
```

### Step 4: Recovery Options

**Option A: Immediate Mitigation (1 min)**
```
In Supabase dashboard:
1. Go to Edge Functions > google-oauth-start
2. Add error logging to understand exact failure point
3. Restart function (if button available)
4. Test with browser dev tools

If OAuth partially working:
1. Post status on status page: "OAuth temporarily degraded"
2. Notify support to offer workarounds
```

**Option B: Fix & Redeploy (10-15 min)**
```bash
# Fix identified issue (e.g., redirect URI)
# Update in code if necessary

# Redeploy function
supabase functions deploy google-oauth-callback --project-id $PROJECT_ID

# Test immediately
curl -s https://your-supabase.supabase.co/functions/v1/google-oauth-start ...

# Verify error rate dropped
# Monitor for 10 minutes
```

**Option C: Rollback (5-10 min)**
```bash
# If recent deployment caused issue
git revert [commit-hash]
./deploy-google-integration-rollback.sh --version [backup-timestamp]

# Test
# Monitor error rates
```

### Step 5: Communication

```
Slack message to #alerts:
"🔴 INVESTIGATING: Google OAuth failures detected
- Error rate: X%
- Users affected: ~Y
- ETA for fix: Z minutes
- Status page: updated"

After resolution:
"🟢 RESOLVED: Google OAuth flow restored
- Root cause: [brief explanation]
- Fix applied: [what was done]
- Impact: X% of users for Y minutes
- Post-mortem: [link to ticket]"
```

### Step 6: Post-Incident

- [ ] Document root cause in ticket
- [ ] Create monitoring alert if not already present
- [ ] Schedule post-mortem if customer impact >5 min
- [ ] Update runbook with lessons learned

---

## Issue: Google Connector Search Failures

### Symptoms
- Google search returns errors or empty results
- "Token refresh failed" in logs
- Users see degraded experience in Vision RAG

### Step 1: Check Error Type (2 min)

```bash
# View recent errors
supabase functions logs google-connector --project-id $PROJECT_ID --tail

# Look for patterns:
# ERROR: invalid_grant -> Token refresh failed
# ERROR: quotaExceeded -> Google Drive API quota hit
# ERROR: 403 Forbidden -> Permission issue
# ERROR: 401 Unauthorized -> Credential invalid
```

### Step 2: Investigate by Error Type

**Error: "invalid_grant" (Token Refresh Failed)**
```
Likely cause: User's Google account revoked access or token too old
Action:
1. Check token age in database:
   SELECT user_id, created_at, updated_at, expires_at 
   FROM external_account_integrations 
   WHERE provider='google' 
   ORDER BY updated_at DESC LIMIT 10;

2. If tokens >90 days old:
   - This is expected (Google tokens expire)
   - User must re-authenticate: click "Connect Google Account" again
   - Notify user

3. If tokens fresh but still failing:
   - Check Google Cloud Console for revocation events
   - Verify client secret is still valid
   - Check Drive API still enabled
```

**Error: "quotaExceeded" (API Quota Hit)**
```
Likely cause: Exceeded Google Drive API daily/per-minute quota
Action:
1. Log into Google Cloud Console
2. Go to APIs & Services > Quotas
3. Search for "Google Drive API"
4. Check current usage vs daily limit
5. Options:
   a) Wait for quota reset (daily at midnight PT)
   b) Increase quota in Google Cloud Console
   c) Temporarily disable Google feature
   
If quota needs increase:
1. Click "Google Drive API" in quotas
2. Select quota to increase (e.g., "Queries per 100 seconds")
3. Click "EDIT QUOTAS"
4. Enter requested amount (recommended: 2x current)
5. Submit for review (usually approved within hours)

Workaround (immediate):
1. Disable Google in Vision RAG
2. Set INCLUDE_GOOGLE=false in Edge Function
3. Notify users
4. Redeploy when quota increased
```

**Error: "403 Forbidden" or "401 Unauthorized"**
```
Likely cause: Credentials invalid or permissions revoked
Action:
1. Verify credentials in Supabase dashboard
   Settings > Edge Functions > Secret variables
   - GOOGLE_CLIENT_ID present? ✓
   - GOOGLE_CLIENT_SECRET present? ✓
   - Valid format? Check length, no truncation

2. Test credentials in Google Cloud Console:
   - Go to APIs & Services > Credentials
   - Verify OAuth client still active
   - Check if credentials recently rotated/regenerated
   
3. If credentials changed:
   - Update in Supabase dashboard
   - Redeploy all functions
   - Test connector

4. If credentials seem valid but still failing:
   - Check Drive API is still enabled
   - Verify project hasn't been suspended
   - Check Cloud Project billing status
```

### Step 3: Check User Token Health

```sql
-- Check overall token status
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired,
  COUNT(CASE WHEN expires_at < NOW() + interval '24 hours' THEN 1 END) as expiring_soon
FROM external_account_integrations
WHERE provider = 'google';

-- If many tokens expired:
-- Most likely cause: Token refresh mechanism failed
-- Action: Check google-connector error logs, see "invalid_grant" section above

-- Check specific user token
SELECT user_id, created_at, expires_at, updated_at
FROM external_account_integrations
WHERE user_id = 'USER_ID' AND provider = 'google';
```

### Step 4: Recovery Options

**Option A: Disable Google Feature (1 min) - Immediate Mitigation**
```
Temporary solution while investigating:

1. In vision-rag-query function, set:
   const includeGoogle = false;  // Override regardless of request

2. Redeploy:
   supabase functions deploy vision-rag-query --project-id $PROJECT_ID

3. Users won't see Google results but system remains stable

4. Communicate:
   "Google Drive search temporarily disabled for maintenance.
    Full RAG search still available."
```

**Option B: Fix Credentials (10 min)**
```
If credentials are invalid:

1. Regenerate in Google Cloud Console
2. Update in Supabase dashboard
3. Redeploy functions:
   - google-oauth-callback (uses client secret)
   - google-connector (uses client secret)
4. Test with small query
5. Monitor error rate for 5 minutes
6. Re-enable if needed
```

**Option C: Increase Quota (If Quota Issue)**
```
If quota exceeded:
1. Request quota increase (see above)
2. While waiting:
   - Limit searches to prevent hammer
   - Stagger retries with exponential backoff
   - Notify users of temporary limitations
3. Once quota increased:
   - Remove temporary limits
   - Update monitoring to track quota usage
```

### Step 5: Rollback (If Recently Deployed)

```bash
# If recent changes caused connector failure
./deploy-google-integration-rollback.sh --version [timestamp] --confirm

# Test immediately with manual query
curl -X POST https://your-supabase.supabase.co/functions/v1/google-connector \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","query":"test"}'
```

### Step 6: Monitoring

After fixing, monitor for 30 minutes:

```bash
# Watch error rate
watch 'supabase functions logs google-connector --project-id $PROJECT_ID --tail'

# Check metrics
# google_connector_error_rate should return to <1%
# google_connector_latency p95 should be <1s
```

---

## Issue: Vision RAG Latency Spike

### Symptoms
- Vision RAG taking 5+ seconds to respond
- p95 latency spike in dashboards
- Users report slow responses

### Step 1: Determine Source (2 min)

```bash
# Check if Google-related
supabase functions logs vision-rag-query --project-id $PROJECT_ID --tail

# Look for:
# - How long google-connector call takes
# - How many sources returned
# - Any timeout errors

# If latency spike coincides with Google queries:
# Likely cause: google-connector or Google API slow
```

### Step 2: Quick Diagnosis

```bash
# Check google-connector latency specifically
supabase functions logs google-connector --project-id $PROJECT_ID --tail

# If connector is slow:
# - Could be token refresh delays
# - Could be Google API slow
# - Could be network issues

# If connector fast but total RAG slow:
# - Could be PageIndex slow
# - Could be LLM processing slow
# - Could be network latency
```

### Step 3: Recovery Options

**Option A: Reduce Google Result Limit (1 min)**
```typescript
// In google-connector: reduce from 5 to 3 results
const googleResults = connectorData.results || [];
const topResults = googleResults.slice(0, 3);  // was 5

// Redeploy
supabase functions deploy google-connector --project-id $PROJECT_ID
```

**Option B: Add Timeout for Google Connector (5 min)**
```typescript
// In vision-rag-query: add timeout wrapper
const googleConnectorTimeout = 2000;  // 2 second timeout
try {
  const connectorRes = await Promise.race([
    fetch(...),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), googleConnectorTimeout)
    )
  ]);
} catch (err) {
  // If timeout, just skip Google results
  console.warn('Google connector timed out, skipping results');
}
```

**Option C: Disable Google Temporarily (1 min)**
```
If connector consistently slow:
Set includeGoogle = false;
Notify team of temporary limitation
Investigate Google API or token refresh issues
```

### Step 4: Post-Incident Analysis

```
Once latency returns to normal:
1. Check which component was slow
2. Add monitoring/alerting for that component
3. Consider optimizations:
   - Parallel vs sequential fetching
   - Result limit tuning
   - Caching strategies
```

---

## Issue: Database Connection Problems

### Symptoms
- External integrations table queries failing
- RLS policy errors in logs
- High error rate on token operations

### Step 1: Check Connectivity (1 min)

```bash
# From local machine
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Should return:
#  ?column?
# ----------
#          1

# If fails: Connection issue
```

### Step 2: Check Table Existence (1 min)

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'external_account_integrations'
);

-- Should return: t (true)
```

### Step 3: Check RLS Policies (2 min)

```sql
-- Check RLS is enabled
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'external_account_integrations';

-- Should show: row level security = ON

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'external_account_integrations';

-- Should show at least one policy for user isolation
```

### Step 4: Recovery Options

**Option A: Re-run Migration (5 min)**
```bash
# Apply migration again
supabase db push --project-id $PROJECT_ID

# This will:
# - Create table if missing
# - Add RLS policies if missing
# - Update schema if changed

# Verify
supabase db pull --project-id $PROJECT_ID
```

**Option B: Manual Table Creation (10 min)**
```sql
-- If migration doesn't work, create manually
CREATE TABLE IF NOT EXISTS external_account_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  access_token VARCHAR(1000),
  refresh_token VARCHAR(1000),
  expires_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE external_account_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own integrations"
  ON external_account_integrations FOR ALL
  USING (auth.uid() = user_id);

-- Verify
SELECT * FROM external_account_integrations LIMIT 0;
```

**Option C: Check for Locks (5 min)**
```sql
-- Check for long-running queries
SELECT pid, query_start, query 
FROM pg_stat_activity 
WHERE query_start < NOW() - interval '10 minutes' 
AND state = 'active';

-- If long query found, can terminate:
SELECT pg_terminate_backend(pid);

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;

-- If locks found, identify blocking queries and resolve
```

---

## Issue: Feature Behaving Unexpectedly

### Symptoms
- Users report Google results not showing
- Feature flag not working
- Intermittent failures

### Step 1: Verify Feature Is Enabled

```bash
# Check vision-rag-query function
grep -n "includeGoogle" supabase/functions/vision-rag-query/index.ts

# Should show:
# - includeGoogle parameter check
# - Conditional google-connector call
# - Sources array merging

# Check RAGView.tsx frontend
grep -n "includeGoogle" frontend/src/components/RAGView.tsx

# Should show:
# - State variable
# - Toggle UI element
# - Request body param
```

### Step 2: Test Feature Directly

```bash
# Test google-connector directly
curl -X POST https://your-supabase.supabase.co/functions/v1/google-connector \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "query": "test search"
  }' | jq

# Should return: { results: [...] } or error details
```

### Step 3: Test End-to-End

```bash
# From frontend
1. Open browser dev tools
2. Network tab
3. Click "Include Google Drive Results" toggle
4. Submit Vision RAG query
5. Check request sent includes: includeGoogle: true
6. Check response includes Google sources

# If not working:
- Check browser console for errors
- Check network tab for failed requests
- Verify request parameters
```

---

## Emergency Procedures

### Disable Google Feature (1 min)

If Google feature is causing widespread problems:

```bash
# Option 1: Frontend (immediate)
# In RAGView.tsx, comment out the entire Google toggle section:
/*
  <div className="google-toggle">
    ...
  </div>
*/

# Option 2: Backend (immediate)
# In vision-rag-query, override includeGoogle:
const includeGoogle = false;  // Always false

# Redeploy whichever applies
supabase functions deploy vision-rag-query --project-id $PROJECT_ID

# Notify users immediately
```

### Escalate to Google Support

If Google API is down:

1. **Check Google Status Page**
   - https://status.cloud.google.com/
   - Look for Google Drive API incidents

2. **Check Google Cloud Support**
   - Log into Google Cloud Console
   - Go to Support > Create ticket
   - Describe issue
   - Wait for response (SLA: 1 hour for critical)

3. **Notify Users**
   - "Google Drive search temporarily unavailable"
   - "Full RAG search still working"
   - ETA for resolution

### Escalate to Supabase Support

If Supabase is down:

1. **Check Supabase Status**
   - https://status.supabase.com/

2. **Contact Supabase Support**
   - supabase.com/support
   - Describe issue
   - Include project ID and function names

3. **Workaround**
   - Try alternative environment
   - Use Supabase backup/replica if available

---

## Common Commands

```bash
# View function logs
supabase functions logs [function-name] --project-id $PROJECT_ID --tail

# Deploy function
supabase functions deploy [function-name] --project-id $PROJECT_ID

# List secrets
supabase secrets list --project-id $PROJECT_ID

# Set secret
supabase secrets set KEY=VALUE --project-id $PROJECT_ID

# Query database
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "QUERY"

# Check git status
git status

# View recent commits
git log --oneline -5

# Rollback
./deploy-google-integration-rollback.sh --version [timestamp]
```

---

## Escalation Contacts

| Role | Name | Slack | Email | Phone |
|------|------|-------|-------|-------|
| On-Call Lead | TBD | @oncall | oncall@company.com | +1-XXX-XXX-XXXX |
| Backend Lead | TBD | @backend-lead | backend@company.com | +1-XXX-XXX-XXXX |
| DevOps Lead | TBD | @devops-lead | devops@company.com | +1-XXX-XXX-XXXX |
| Google Account Manager | TBD | @google-am | google@company.com | +1-XXX-XXX-XXXX |

---

## Resources

- [QUICK_REFERENCE_GOOGLE_INTEGRATION.md](./QUICK_REFERENCE_GOOGLE_INTEGRATION.md) - API Reference & Config
- [MONITORING_SETUP_GOOGLE_INTEGRATION.md](./MONITORING_SETUP_GOOGLE_INTEGRATION.md) - Dashboards & Metrics
- [GOOGLE_DRIVE_INTEGRATION.md](./GOOGLE_DRIVE_INTEGRATION.md) - Architecture & Security
- [Google API Status](https://status.cloud.google.com/)
- [Supabase Status](https://status.supabase.com/)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Last Updated:** November 17, 2025  
**Review Frequency:** Monthly  
**Next Review:** December 17, 2025
