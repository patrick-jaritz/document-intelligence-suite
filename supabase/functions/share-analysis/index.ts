import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { repository_url, share_token, action } = await req.json()

    const supabase = createClient(supabaseUrl, supabaseKey)

    if (action === 'create_share') {
      // Create a shareable link
      if (!repository_url) {
        throw new Error('repository_url is required')
      }

      // Generate a unique share token
      const shareToken = generateShareToken()

      // Store in database (if you have a shares table)
      // For now, we'll return the token

      return new Response(
        JSON.stringify({
          success: true,
          share_token: shareToken,
          share_url: `${supabaseUrl}/share/${shareToken}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'get_shared_analysis') {
      // Retrieve shared analysis
      if (!share_token) {
        throw new Error('share_token is required')
      }

      // In production, look up the share token in database
      // For now, return a mock response
      return new Response(
        JSON.stringify({
          success: true,
          share_token: share_token,
          repository_url: 'https://github.com/example/repo',
          shared_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

function generateShareToken(): string {
  // Generate a secure random token
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
