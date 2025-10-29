#!/usr/bin/env node

/**
 * Helper script to check recent rag-query logs from Supabase
 * 
 * Note: Supabase CLI has limited log access. This provides instructions.
 */

console.log(`
📋 HOW TO GET LOGS FOR DEBUGGING:

1. BROWSER CONSOLE (Easiest):
   - Open DevTools (F12 or Cmd+Option+I)
   - Go to "Console" tab
   - Look for logs starting with:
     * 🔍 Applying documentId filter
     * 🔍 Database query result
     * 🔍 Verifying chunks match requested documentId
     * ❌ CRITICAL ERROR or 🚨 DATABASE QUERY ERROR
   - Copy the relevant log entries

2. SUPABASE DASHBOARD:
   - Go to: https://supabase.com/dashboard/project/joqnpibrfzqflyogrkht/functions
   - Click on "rag-query" function
   - Click on "Logs" tab
   - Look for recent invocations
   - Find logs with documentId filtering information

3. WHAT TO LOOK FOR IN THE LOGS:

   CRITICAL INFORMATION NEEDED:
   
   a) Document ID being queried:
      Look for: "🔍 Applying documentId filter:" 
      Should show: { documentId: "...", isUuidLike: true/false }
   
   b) What chunks were returned:
      Look for: "🔍 Database query result:"
      Should show: {
        chunksCount: X,
        uniqueDocumentIds: [...],
        documentIdMatch: "✅ MATCH" or "❌ MISMATCH"
      }
   
   c) Any errors about wrong documents:
      Look for: "🚨 DATABASE QUERY ERROR" or "❌ CRITICAL ERROR"
      This will tell us if the database filter is failing

4. KEY QUESTIONS TO ANSWER:
   - What documentId is being queried? (from browser console)
   - What documentIds are in the returned chunks? (from logs)
   - Are they the same? (if not, that's the problem)
   - Is the filter being applied? (check "🔍 Applying documentId filter")

5. QUICK TEST:
   Run a query and immediately check the browser console.
   You should see something like:
   
   🔍 Applying documentId filter: { documentId: "...", ... }
   🔍 Database query result: { uniqueDocumentIds: [...] }
   
   If uniqueDocumentIds contains a different ID than documentId,
   that's the issue!
`);

console.log('\n💡 TIP: The browser console is usually the easiest way to see the logs.');
console.log('   Just run a query and look for the 🔍 emoji entries.\n');
