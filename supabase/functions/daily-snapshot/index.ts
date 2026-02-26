import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate: require either a valid service-role JWT or a shared secret token
    const authHeader = req.headers.get('Authorization') ?? ''
    const cronSecret = Deno.env.get('CRON_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`
    const isServiceRole = authHeader === `Bearer ${serviceKey}`

    if (!isCronAuth && !isServiceRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Get all users who have assets
    const { data: users, error: usersError } = await supabase
      .from('assets')
      .select('user_id')
    
    if (usersError) throw usersError

    const uniqueUserIds = [...new Set((users || []).map(u => u.user_id))]
    const today = new Date().toISOString().split('T')[0]
    const results: { user_id: string; status: string }[] = []

    for (const userId of uniqueUserIds) {
      try {
        // Get assets
        const { data: assets } = await supabase
          .from('assets')
          .select('total_cost, current_value, currency')
          .eq('user_id', userId)

        // Get user settings for FX rate
        const { data: settings } = await supabase
          .from('user_settings')
          .select('inr_to_aed_rate')
          .eq('user_id', userId)
          .single()

        const inrToAed = settings?.inr_to_aed_rate || 0.044

        // Get liabilities
        const { data: liabilities } = await supabase
          .from('liabilities')
          .select('outstanding, currency')
          .eq('user_id', userId)
          .eq('is_active', true)

        // Get MF holdings
        const { data: mfHoldings } = await supabase
          .from('mf_holdings')
          .select('invested_amount, current_value')
          .eq('user_id', userId)
          .eq('is_active', true)

        // Calculate totals
        let totalInvested = 0
        let totalValue = 0

        for (const asset of assets || []) {
          const cost = Number(asset.total_cost) || 0
          const val = Number(asset.current_value) || cost
          if (asset.currency === 'INR') {
            totalInvested += cost * inrToAed
            totalValue += val * inrToAed
          } else {
            totalInvested += cost
            totalValue += val
          }
        }

        // Add MF
        for (const h of mfHoldings || []) {
          const inv = Number(h.invested_amount) || 0
          const cur = Number(h.current_value) || inv
          totalInvested += inv * inrToAed
          totalValue += cur * inrToAed
        }

        let totalLiabilities = 0
        for (const l of liabilities || []) {
          const out = Number(l.outstanding) || 0
          totalLiabilities += l.currency === 'INR' ? out * inrToAed : out
        }

        const netWorth = totalValue - totalLiabilities

        // Upsert snapshot
        const { error: upsertError } = await supabase
          .from('portfolio_snapshots')
          .upsert({
            user_id: userId,
            snapshot_date: today,
            total_value: totalValue,
            total_invested: totalInvested,
            total_liabilities: totalLiabilities,
            net_worth: netWorth,
          }, { onConflict: 'user_id,snapshot_date' })

        if (upsertError) throw upsertError
        results.push({ user_id: userId, status: 'ok' })
      } catch (e) {
        results.push({ user_id: userId, status: `error: ${e.message}` })
      }
    }

    return new Response(JSON.stringify({ date: today, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
