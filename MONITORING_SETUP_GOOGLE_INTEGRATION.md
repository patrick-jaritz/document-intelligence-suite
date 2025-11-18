# Google Drive Integration - Production Monitoring & Alerts Guide

**Document:** Production Monitoring Setup  
**Status:** Deployment Reference  
**Last Updated:** November 17, 2025

---

## Table of Contents

1. [Monitoring Overview](#overview)
2. [Metrics & KPIs](#metrics)
3. [Logging Strategy](#logging)
4. [Alert Configuration](#alerts)
5. [Dashboards](#dashboards)
6. [Monitoring Tools](#tools)
7. [Health Checks](#health-checks)
8. [SLA & Response Times](#sla)

---

## Monitoring Overview {#overview}

### Goal
Detect and respond to issues with Google Drive integration within **5 minutes** of occurrence.

### Monitoring Scope

| Component | Priority | Monitored By |
|-----------|----------|--------------|
| Google OAuth flow | Critical | Error rate alerts |
| Google Drive API calls | Critical | Latency & error alerts |
| Vision RAG with Google | High | Performance alerts |
| Token refresh mechanism | High | Success rate alerts |
| Database operations | Medium | Query performance alerts |
| Frontend UI/UX | Medium | Error tracking |

### Deployment Checklist

- [ ] Set up Supabase Edge Function logging
- [ ] Configure error tracking (Sentry/similar)
- [ ] Set up performance monitoring (APM)
- [ ] Create monitoring dashboards
- [ ] Configure alert channels (Slack, PagerDuty)
- [ ] Document escalation procedures
- [ ] Train on-call team
- [ ] Set up SLA tracking

---

## Metrics & KPIs {#metrics}

### Edge Function Metrics

#### Google OAuth Flow

```
Metric Name: google_oauth_start_invocations
Type: Counter
Alert Threshold: Spike >50% from baseline
Description: Tracks how often OAuth flow is initiated
Priority: High

Metric Name: google_oauth_callback_success_rate
Type: Gauge (percentage)
Alert Threshold: <95% success rate
Target: >99% success rate
Description: Percentage of OAuth callbacks that successfully store tokens
Priority: Critical

Metric Name: google_oauth_error_rate
Type: Gauge (percentage)
Alert Threshold: >2% error rate
Common Errors to Track:
  - Invalid state parameter (CSRF)
  - Token exchange failed
  - Database write failure
  - Invalid redirect URI
```

#### Google Connector Metrics

```
Metric Name: google_connector_search_count
Type: Counter
Alert Threshold: None (informational)
Description: Number of Google Drive searches performed
Priority: Medium

Metric Name: google_connector_search_latency
Type: Histogram (ms)
Alert Threshold: p95 > 2000ms (2 seconds)
Target: p95 < 1000ms
Description: Time to complete Google Drive search
Priority: High
Includes: Token lookup + refresh + API call

Metric Name: google_connector_token_refresh_rate
Type: Gauge (percentage)
Alert Threshold: None (informational)
Target: 5-15% of requests
Description: Percentage of searches requiring token refresh
Priority: Medium

Metric Name: google_connector_error_rate
Type: Gauge (percentage)
Alert Threshold: >5% error rate
Common Errors:
  - Invalid token (need refresh)
  - Google API rate limit hit
  - Malformed query
  - Database read failure
```

#### Vision RAG Integration Metrics

```
Metric Name: vision_rag_google_included_count
Type: Counter
Alert Threshold: None
Description: How many Vision RAG queries included Google results
Priority: Medium

Metric Name: vision_rag_sources_count
Type: Histogram (count)
Alert Threshold: None
Target: Typically 3-8 sources combined
Description: Number of merged sources in response (PageIndex + Google)
Priority: Medium

Metric Name: vision_rag_total_latency
Type: Histogram (ms)
Alert Threshold: p95 > 5000ms (5 seconds)
Target: p95 < 3000ms
Description: Total time for Vision RAG with optional Google
Priority: High

Metric Name: vision_rag_google_latency_increase
Type: Gauge (percentage)
Alert Threshold: >30% increase when Google enabled
Description: Performance impact of adding Google results
Priority: Medium
```

#### Database Metrics

```
Metric Name: external_integrations_query_time
Type: Histogram (ms)
Alert Threshold: p95 > 500ms
Target: p95 < 200ms
Description: Query time for token lookups
Priority: High

Metric Name: external_integrations_row_count
Type: Gauge
Alert Threshold: >100,000 rows (size concern)
Target: <50,000 active integrations
Description: Total user integrations stored
Priority: Low

Metric Name: rls_policy_enforcement
Type: Counter
Alert Threshold: Denied access attempts
Description: Track RLS policy violations
Priority: High
```

### Application-Level Metrics

```
Metric Name: oauth_token_expiry_ratio
Type: Gauge (percentage)
Alert Threshold: >50% of tokens expiring within 24h
Target: Tokens refreshed before expiry
Description: Tracks upcoming token expirations
Priority: Medium

Metric Name: google_drive_file_access_success_rate
Type: Gauge (percentage)
Alert Threshold: <90% success rate
Target: >99% success rate
Description: Users successfully accessing Google files
Priority: High

Metric Name: frontend_google_button_click_rate
Type: Counter
Alert Threshold: Spike >2x baseline
Description: Tracks "Connect Google Account" button usage
Priority: Low (UX metric)
```

---

## Logging Strategy {#logging}

### Log Levels

| Level | When to Use | Examples |
|-------|-----------|----------|
| ERROR | Operational failures | OAuth failed, API error, database error |
| WARN | Degraded operation | Token refresh retry, slow response |
| INFO | Normal operation | OAuth success, connector query, sources merged |
| DEBUG | Detailed information | Token lookup details, query parameters (DEBUG only in staging) |

### Log Retention

- **ERROR/WARN**: 30 days minimum
- **INFO**: 7 days minimum
- **DEBUG**: 24 hours (staging only)

### Log Format

```json
{
  "timestamp": "2025-11-17T14:30:45.123Z",
  "level": "ERROR",
  "function": "google-connector",
  "userId": "user-id-hashed",
  "requestId": "req-uuid",
  "message": "Token refresh failed",
  "errorCode": "GOOGLE_API_ERROR",
  "statusCode": 401,
  "duration_ms": 1234,
  "metadata": {
    "tokenAge": "28 days",
    "retryAttempt": 1
  }
}
```

### Critical Logging Points

1. **OAuth Callback**
   ```
   - State parameter validation
   - Token exchange attempt
   - Token storage success/failure
   - Session creation
   ```

2. **Google Connector**
   ```
   - Token lookup
   - Token refresh attempt
   - API call to Google Drive
   - Result processing
   - Error responses
   ```

3. **Vision RAG**
   ```
   - includeGoogle flag value
   - Google results retrieval attempt
   - Source merging
   - Response construction
   ```

---

## Alert Configuration {#alerts}

### Critical Alerts (Immediate Page)

```
Rule 1: OAuth Success Rate Drop
Threshold: <95% success rate
Duration: 5 minutes sustained
Action: Page on-call engineer
Message: "Google OAuth flow has <95% success rate - check google-oauth-callback logs"
Recovery: Check Google Cloud Console for API issues, verify secrets

Rule 2: Google Connector Error Rate
Threshold: >5% error rate
Duration: 10 minutes sustained
Action: Page on-call engineer
Message: "Google connector error rate >5% - check google-connector logs"
Recovery: Check Google Drive API quota, verify tokens

Rule 3: Vision RAG Latency Spike
Threshold: p95 latency >5s with Google enabled
Duration: 5 minutes
Action: Page on-call engineer
Message: "Vision RAG latency spike detected with Google enabled"
Recovery: Check google-connector performance, consider disabling Google temporarily

Rule 4: Database Connectivity Issue
Threshold: Query failure rate >2%
Duration: 2 minutes
Action: Page database team
Message: "Database queries failing >2% - possible connectivity issue"
Recovery: Check Supabase dashboard, verify firewall rules
```

### High Alerts (Notify Team)

```
Rule 5: Token Refresh Failures
Threshold: >10% of refreshes failing
Duration: 30 minutes
Action: Notify team in Slack
Message: "Token refresh failures elevated - may indicate Google API issues"

Rule 6: Elevated Query Latency
Threshold: p95 > 1000ms for google-connector
Duration: 15 minutes
Action: Notify team in Slack
Message: "Google connector latency elevated - response time degraded"

Rule 7: High Memory Usage
Threshold: Function memory usage >500MB
Duration: 10 minutes
Action: Notify team in Slack
Message: "Edge function memory usage high - potential memory leak"
```

### Medium Alerts (Create Ticket)

```
Rule 8: Unusual API Usage Patterns
Threshold: 3x normal daily search volume
Duration: 1 hour
Action: Create ticket
Message: "Unusual spike in Google searches - investigate"

Rule 9: Token Expiration Approaching
Threshold: >50% of tokens expiring within 24h
Duration: Once daily at 2 AM UTC
Action: Create ticket
Message: "Bulk token refresh recommended"

Rule 10: Error Pattern Changes
Threshold: New error types appearing
Duration: Any occurrence
Action: Create ticket
Message: "New error pattern detected in logs"
```

### Alert Channels

| Alert Level | Channel | Team | Response Time |
|-------------|---------|------|---------------|
| Critical | PagerDuty + Slack | On-call | 5 min |
| High | Slack #alerts | Team | 15 min |
| Medium | GitHub Issues | Team | 4 hours |
| Low | Log-only | Archive | N/A |

---

## Dashboards {#dashboards}

### Real-Time Dashboard (Update: 30 seconds)

```
Section 1: OAuth Flow
├─ Success rate (current %)
├─ Requests per minute
├─ Error count (by type)
└─ Response time distribution

Section 2: Google Connector
├─ Search count (per minute)
├─ Error rate (%)
├─ Latency (p50/p95/p99)
├─ Token refresh rate (%)
└─ API quota usage

Section 3: Vision RAG
├─ Requests with Google (%)
├─ Total latency distribution
├─ Error rate
├─ Source count distribution
└─ Google vs PageIndex usage ratio

Section 4: Database
├─ Query latency distribution
├─ Connection pool usage
├─ Row count (external_integrations)
└─ RLS policy violations
```

### Historical Dashboard (Update: 1 hour)

```
Trends to Track (Last 7 days):
├─ OAuth success rate trend
├─ Connector error rate trend
├─ Latency trends (hourly aggregates)
├─ Daily API calls to Google
├─ Token refresh frequency
├─ User engagement (Google features used)
└─ Error pattern changes
```

### Health Status Page

```
Component Status (Updated every 5 minutes):
├─ Google OAuth: 🟢 HEALTHY / 🟡 DEGRADED / 🔴 DOWN
├─ Google Drive API: 🟢 HEALTHY / 🟡 DEGRADED / 🔴 DOWN
├─ Vision RAG Engine: 🟢 HEALTHY / 🟡 DEGRADED / 🔴 DOWN
├─ Database: 🟢 HEALTHY / 🟡 DEGRADED / 🔴 DOWN
└─ Last updated: [timestamp]
```

---

## Monitoring Tools {#tools}

### Recommended Stack

1. **Metrics Collection: Supabase Built-in + Custom**
   - Use Supabase dashboard metrics
   - Log custom metrics to PostgreSQL
   - Query metrics for dashboard

2. **Logging: Supabase Edge Function Logs**
   - Built-in function logging
   - Real-time log viewer
   - Export to external service (DataDog, New Relic)

3. **Error Tracking: Sentry (Recommended)**
   ```javascript
   // In Edge Functions
   import * as Sentry from "@sentry/deno";

   Sentry.init({
     dsn: Deno.env.get("SENTRY_DSN"),
     tracesSampleRate: 0.1
   });

   try {
     // Function code
   } catch (error) {
     Sentry.captureException(error);
   }
   ```

4. **APM: Datadog or New Relic**
   - Monitor Edge Function performance
   - Track distributed traces
   - Correlate frontend and backend errors

5. **Uptime Monitoring: Uptime Robot**
   ```
   Monitor URLs:
   - https://your-domain/functions/v1/google-oauth-start
   - https://your-domain/functions/v1/google-connector
   - https://your-domain/functions/v1/vision-rag-query
   ```

### Setup Commands

```bash
# Export Supabase logs to file
supabase functions logs google-connector --project-id YOUR_ID --limit 1000 > logs.txt

# Set up Sentry
supabase secrets set SENTRY_DSN=https://... --project-id YOUR_ID

# Monitor specific function
watch 'supabase functions logs vision-rag-query --project-id YOUR_ID --tail'
```

---

## Health Checks {#health-checks}

### Automated Health Checks (Run every 5 minutes)

```bash
#!/bin/bash
# health-check-google-integration.sh

ENDPOINT="https://your-supabase.supabase.co/functions/v1"

# Check 1: OAuth Start
echo -n "OAuth Start: "
if curl -s -f "$ENDPOINT/google-oauth-start" -H "Authorization: Bearer $SERVICE_ROLE_KEY" > /dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED - alert"
fi

# Check 2: Google Connector
echo -n "Google Connector: "
if curl -s -f -X POST "$ENDPOINT/google-connector" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -d '{"userId":"test","query":"test"}' > /dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED - alert"
fi

# Check 3: Vision RAG Query
echo -n "Vision RAG: "
if curl -s -f -X POST "$ENDPOINT/vision-rag-query" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -d '{"question":"test","document_id":"test"}' > /dev/null; then
    echo "✓ OK"
else
    echo "✗ FAILED - alert"
fi

# Check 4: Database Connection
echo -n "Database: "
if psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM external_account_integrations LIMIT 1;" > /dev/null 2>&1; then
    echo "✓ OK"
else
    echo "✗ FAILED - alert"
fi
```

### Manual Health Check Procedure

When alerted to issues:

1. **Check Supabase Dashboard**
   - Go to Edge Functions > View logs
   - Search for errors in last 5 minutes
   - Note error patterns

2. **Check Google Cloud Console**
   - Go to APIs & Services > Quotas
   - Verify Drive API hasn't hit quota
   - Check authorization errors

3. **Check Database**
   - Run: `SELECT COUNT(*) FROM external_account_integrations;`
   - Verify no locks or slow queries
   - Check RLS policy effectiveness

4. **Check Frontend**
   - Monitor browser console for errors
   - Check network tab for failed requests
   - Verify correct endpoints being called

---

## SLA & Response Times {#sla}

### Service Level Objectives (SLOs)

```
OAuth Flow:
├─ Availability: 99.5% uptime
├─ Success Rate: >99% success rate
├─ Response Time: p95 < 500ms
└─ MTTR: <15 minutes

Google Connector:
├─ Availability: 99% uptime (dependent on Google API)
├─ Success Rate: >98% success rate
├─ Response Time: p95 < 1000ms
└─ MTTR: <30 minutes

Vision RAG with Google:
├─ Availability: 99% uptime
├─ Response Time: p95 < 3000ms
├─ Error Rate: <2%
└─ MTTR: <30 minutes
```

### Incident Response Times

| Severity | Alert Time | Response Time | Resolution Target |
|----------|-----------|---------------|------------------|
| Critical (Outage) | Immediate | 5 min | 30 min |
| High (Degraded) | 15 min | 15 min | 2 hours |
| Medium (Issues) | 4 hours | 4 hours | 24 hours |
| Low (Optimizations) | Next day | Next day | 1 week |

### On-Call Runbook Links

- [Critical Issues Runbook](#) ← See on-call guide
- [Google API Issues](#) ← See troubleshooting
- [Token/Auth Issues](#) ← See auth troubleshooting
- [Database Issues](#) ← See database troubleshooting
- [Performance Issues](#) ← See optimization guide

---

## Review & Maintenance

- **Weekly:** Review alert triggers, adjust thresholds based on baseline
- **Monthly:** Review dashboard relevance, archive old logs, analyze trends
- **Quarterly:** Review SLOs, compare against actual metrics, plan improvements
- **Annually:** Conduct incident drills, update runbooks, review tooling

---

**Next Step:** Configure all alerts in your monitoring tool and set up dashboard
