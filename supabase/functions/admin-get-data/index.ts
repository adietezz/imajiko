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

    const { action, target_id } = await req.json()
    if (!action) {
      return new Response(JSON.stringify({ error: 'action is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (action === 'list-all') {
      // Fetch all tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('tokens')
        .select('*')
        .order('created_at', { ascending: false })

      if (tokensError) {
        throw new Error('Failed to fetch tokens: ' + tokensError.message)
      }

      // Fetch all orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (ordersError) {
        throw new Error('Failed to fetch orders: ' + ordersError.message)
      }

      return new Response(JSON.stringify({ tokens, orders }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'delete-token') {
      if (!target_id) {
        return new Response(JSON.stringify({ error: 'target_id is required for deletion' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // First, delete related orders if there are any
      // Since orders references tokens, delete orders first or delete cascade
      const { error: deleteOrdersError } = await supabase
        .from('orders')
        .delete()
        .eq('token', target_id)

      if (deleteOrdersError) {
        throw new Error('Failed to delete related orders: ' + deleteOrdersError.message)
      }

      // Delete the token
      const { error: deleteTokenError } = await supabase
        .from('tokens')
        .delete()
        .eq('token', target_id)

      if (deleteTokenError) {
        throw new Error('Failed to delete token: ' + deleteTokenError.message)
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else if (action === 'delete-order') {
      if (!target_id) {
        return new Response(JSON.stringify({ error: 'target_id is required for deletion' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Delete order
      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', target_id)

      if (deleteOrderError) {
        throw new Error('Failed to delete order: ' + deleteOrderError.message)
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })

    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
