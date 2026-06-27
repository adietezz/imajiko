import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const {
      token,
      template_id,
      nama_pengirim,
      nama_penerima,
      pesan,
      foto_url,
      musik_url,
      email,
      ...customFields
    } = await req.json()

    // Validate required fields
    if (!token || !template_id || !nama_penerima || !pesan || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Atomic update token used state
    const { data: updatedTokens, error: updateError } = await supabase
      .from('tokens')
      .update({ used: true })
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .select()

    if (updateError || !updatedTokens || updatedTokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Token is invalid, expired, or already used' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const tokenData = updatedTokens[0]

    // Verify template and email match
    if (tokenData.template_id !== template_id || tokenData.email !== email) {
      // Revert token status
      await supabase.from('tokens').update({ used: false }).eq('token', token)
      return new Response(
        JSON.stringify({ error: 'Token template or email mismatch' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Insert order
    const { data: orderData, error: insertError } = await supabase
      .from('orders')
      .insert({
        token,
        template_id,
        nama_pengirim,
        nama_penerima,
        pesan,
        foto_url,
        musik_url,
        email,
        custom_fields: customFields,
        status: 'done',
      })
      .select('id')
      .single()

    if (insertError) {
      // Revert token status if insert fails
      await supabase.from('tokens').update({ used: false }).eq('token', token)
      return new Response(
        JSON.stringify({ error: 'Failed to create order: ' + insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify({ order_id: orderData.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
