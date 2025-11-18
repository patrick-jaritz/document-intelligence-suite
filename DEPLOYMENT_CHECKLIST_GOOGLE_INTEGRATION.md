# Google Drive Integration - Deployment Checklist

**Implementation Date:** November 17, 2025  
**Status:** ✅ Development Complete - Ready for Staging/Production

## Pre-Deployment Verification

### Code Quality
- [x] All TypeScript files compile without errors
- [x] Edge Functions follow Deno runtime requirements
- [x] Frontend components have proper type definitions
- [x] No hardcoded secrets or credentials
- [x] CORS and security headers properly configured

### Testing
- [x] Frontend test suite: **59/59 tests passing**
- [x] Google Connector tests: **40+ test cases**
- [x] Vision RAG integration tests: **35+ test cases**
- [x] No breaking changes to existing functionality
- [x] Tests cover error scenarios and edge cases

### Documentation
- [x] GOOGLE_DRIVE_INTEGRATION.md created with full details
- [x] Architecture diagram included
- [x] Data flow documented
- [x] Security considerations listed
- [x] Future enhancements identified

## Deployment Steps

### Phase 1: Setup (Pre-Deployment)

**Timing:** Do this before deploying any code

1. **Create Google Cloud Project**
   - [ ] Go to https://console.cloud.google.com/
   - [ ] Create new project (name: "document-intelligence-google-drive")
   - [ ] Enable Google Drive API (APIs & Services > Library)
   - [ ] Enable Google+ API (for user profile access)

2. **Generate OAuth 2.0 Credentials**
   - [ ] Go to APIs & Services > Credentials
   - [ ] Create OAuth 2.0 Client ID (Application type: Web application)
   - [ ] Add Authorized redirect URIs:
     ```
     https://<your-supabase-project>.supabase.co/functions/v1/google-oauth-callback
     http://localhost:5173  # For local testing
     ```
   - [ ] Copy Client ID and Client Secret
   - [ ] Store securely (use Supabase secrets, not in code)

3. **Prepare Environment Variables**
   - [ ] Document all required env vars
   - [ ] Obtain all API keys and secrets
   - [ ] Format for Supabase configuration

### Phase 2: Staging Deployment

**Timing:** Deploy to staging environment first

1. **Prepare Staging Database**
   - [ ] Backup production database
   - [ ] Create staging database copy (or use separate Supabase project)
   - [ ] Test migration on staging

2. **Deploy Migration**
   ```bash
   cd /Users/patrickjaritz/CODE/document-intelligence-suite-standalone
   supabase migration up
   
   # Verify table created
   supabase db pull  # Should show external_account_integrations
   ```
   - [ ] Verify `external_account_integrations` table exists
   - [ ] Check RLS policies are enabled
   - [ ] Test table access with service role

3. **Configure Staging Environment Variables**
   - [ ] Set in Supabase project settings:
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_OAUTH_REDIRECT_URL`
     - (Optional) `GOOGLE_CONNECTOR_URL`
   - [ ] Verify via `supabase env` command

4. **Deploy Edge Functions**
   ```bash
   # Deploy in order:
   supabase functions deploy google-oauth-start
   supabase functions deploy google-oauth-callback
   supabase functions deploy google-connector
   supabase functions deploy vision-rag-query  # Updated
   
   # Verify all functions deployed
   supabase functions list
   ```
   - [ ] All 4 functions listed and "ready"
   - [ ] No deployment errors in logs
   - [ ] Function URLs accessible

5. **Deploy Frontend Changes**
   - [ ] Run tests: `npm test` (verify 59/59 passing)
   - [ ] Build production bundle: `npm run build`
   - [ ] Check for TypeScript errors: `npm run type-check`
   - [ ] Deploy to staging environment

### Phase 3: Integration Testing (Staging)

**Timing:** After staging deployment

1. **Test OAuth Flow**
   - [ ] Navigate to RAGView in staging environment
   - [ ] Select Vision RAG provider
   - [ ] Check "Include Google Drive Results" appears
   - [ ] Click "Connect Google Account" (or GoogleConnect button)
   - [ ] Authenticate with Google test account
   - [ ] Verify redirect back to app
   - [ ] Check `external_account_integrations` table for stored tokens
   ```sql
   SELECT * FROM external_account_integrations 
   WHERE provider = 'google' 
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Test Google Connector Function**
   - [ ] Call function directly via Supabase dashboard
   ```bash
   curl -X POST https://<project>.supabase.co/functions/v1/google-connector \
     -H "Authorization: Bearer <service-role-key>" \
     -H "Content-Type: application/json" \
     -d '{"userId": "<user-uuid>", "query": "test", "pageSize": 5}'
   ```
   - [ ] Verify returns array of files or empty array
   - [ ] Check for proper error messages if integration missing

3. **Test Vision RAG with Google**
   - [ ] Upload test document to PageIndex
   - [ ] Wait for PageIndex indexing to complete
   - [ ] Submit Vision RAG query WITH "Include Google Drive Results" enabled
   - [ ] Check response:
     - [ ] `answer` field populated
     - [ ] `sources` array includes both PageIndex and Google results
     - [ ] Google results have `nodeId` starting with `google:`
     - [ ] Google results have `metadata.webViewLink` set
   - [ ] Click on Google Drive links to verify they open correctly

4. **Test Error Scenarios**
   - [ ] Query with includeGoogle=true but no Google integration
     - [ ] Should succeed (Google results skipped gracefully)
   - [ ] Disconnect Google account and try again
     - [ ] Should fail gracefully (no 500 error)
   - [ ] Test with invalid userId
     - [ ] Should return 404 or empty results
   - [ ] Stop Google API and test
     - [ ] Should timeout and continue with PageIndex results

5. **Performance Testing**
   - [ ] Measure query time with and without Google
   - [ ] Target: Total response time < 30 seconds
   - [ ] Check error logs for any warnings

### Phase 4: Security Validation

**Timing:** Before production deployment

1. **Token Security**
   - [ ] Verify tokens are NOT returned in API responses
   - [ ] Check RLS policies prevent cross-user access
   - [ ] Test token refresh mechanism works

2. **OAuth Security**
   - [ ] Verify state parameter prevents CSRF
   - [ ] Check redirect URI matches exactly
   - [ ] Verify client secret is never exposed to frontend

3. **Input Validation**
   - [ ] Test with SQL injection attempt in query
   - [ ] Test with XSS payload in document title
   - [ ] Test with excessively long queries
   - [ ] All should be properly escaped/rejected

4. **Rate Limiting**
   - [ ] Consider adding rate limiting to google-connector
   - [ ] Set limits: max 100 queries/hour/user
   - [ ] Monitor quota usage in Google Cloud

### Phase 5: Production Deployment

**Timing:** After staging validation passes

1. **Production Environment Setup**
   - [ ] Create Google Cloud credentials for production
   - [ ] Configure prod redirect URI in Google Console
   - [ ] Set production env vars in Supabase
   - [ ] Backup production database

2. **Deploy to Production**
   ```bash
   supabase migration up --project-ref <prod-project-ref>
   supabase functions deploy google-oauth-start --project-ref <prod-project-ref>
   supabase functions deploy google-oauth-callback --project-ref <prod-project-ref>
   supabase functions deploy google-connector --project-ref <prod-project-ref>
   supabase functions deploy vision-rag-query --project-ref <prod-project-ref>
   ```
   - [ ] All functions deployed successfully
   - [ ] No errors in deployment logs

3. **Production Validation**
   - [ ] Smoke test: OAuth flow works
   - [ ] Smoke test: Vision RAG with Google returns results
   - [ ] Monitor error rates for 24 hours
   - [ ] Check Google API quota is being consumed as expected

4. **Monitoring Setup**
   - [ ] Enable Supabase monitoring
   - [ ] Create alerts for:
     - [ ] google-connector error rate > 5%
     - [ ] vision-rag-query response time > 15s
     - [ ] Google API quota warnings
   - [ ] Setup logging/audit trail

5. **Rollback Plan**
   - [ ] Document rollback procedure
   - [ ] Have backup of migration SQL
   - [ ] Know how to disable feature via env vars
   - [ ] Know how to revert functions quickly

## Post-Deployment

### Immediate (First 24 hours)
- [ ] Monitor error logs continuously
- [ ] Check if any users encounter issues
- [ ] Verify Google API quota usage is normal
- [ ] Confirm no unexpected database load

### Short-term (First week)
- [ ] Gather user feedback on feature
- [ ] Monitor performance metrics
- [ ] Check for any security incidents
- [ ] Verify token refresh is working

### Long-term (Ongoing)
- [ ] Add analytics for feature usage
- [ ] Monitor Google API costs
- [ ] Plan enhancements based on feedback
- [ ] Schedule security audit

## Rollback Procedure

If issues arise post-deployment:

1. **Immediate Response**
   ```bash
   # Disable feature by removing env vars
   supabase secrets unset GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_OAUTH_REDIRECT_URL
   
   # Or redeploy without google-connector call
   # Edit vision-rag-query to skip google-connector
   supabase functions deploy vision-rag-query --force
   ```

2. **Full Rollback**
   ```bash
   # Revert migration
   supabase db reset  # or migrate to previous version
   
   # Or delete table if necessary
   DROP TABLE external_account_integrations;
   ```

3. **Monitor**
   - [ ] Verify RAG queries work without Google
   - [ ] Check error rates return to normal
   - [ ] Notify users of temporary feature unavailability

## Sign-Off Checklist

**Development Complete:**
- [x] All code written and tested
- [x] Documentation complete
- [x] No breaking changes

**Ready for Staging:**
- [ ] Google Cloud project created
- [ ] OAuth credentials generated
- [ ] Environment variables prepared

**Staging Validation Complete:**
- [ ] All integration tests passed
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Error scenarios tested

**Ready for Production:**
- [ ] Prod environment variables set
- [ ] Deployment scripts tested
- [ ] Team awareness and training
- [ ] Rollback plan documented

**Production Deployed:**
- [ ] All functions deployed successfully
- [ ] Smoke tests pass
- [ ] Monitoring active
- [ ] Team on alert

---

## Key Contacts & Resources

- **Google Cloud Support:** https://cloud.google.com/support
- **Supabase Support:** https://supabase.com/support
- **Relevant Docs:**
  - GOOGLE_DRIVE_INTEGRATION.md (this repo)
  - Google Drive API: https://developers.google.com/drive/api/guides
  - Supabase Edge Functions: https://supabase.com/docs/guides/functions

---

**Checklist Version:** 1.0  
**Last Updated:** November 17, 2025
