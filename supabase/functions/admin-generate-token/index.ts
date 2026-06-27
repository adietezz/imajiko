import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify admin key
    const clientAdminKey = req.headers.get('x-admin-key')
    const systemAdminKey = Deno.env.get('ADMIN_KEY')

    if (!systemAdminKey) {
      return new Response(
        JSON.stringify({ error: 'ADMIN_KEY server configuration is missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (clientAdminKey !== systemAdminKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { template_id, email, expires_in_hours } = await req.json()
    if (!template_id || !email) {
      return new Response(
        JSON.stringify({ error: 'template_id and email are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Generate secure 32-character token
    const token = crypto.randomUUID().replace(/-/g, '').toUpperCase()

    // Calculate expiration
    const hours = Number(expires_in_hours) || 24
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

    // Insert token
    const { error: insertError } = await supabase
      .from('tokens')
      .insert({
        token,
        template_id,
        email,
        used: false,
        expires_at: expiresAt,
      })

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate token: ' + insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(
      JSON.stringify({
        token,
        expires_at: expiresAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
