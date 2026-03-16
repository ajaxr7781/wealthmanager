import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // This function is called by pg_cron or authenticated users
    // verify_jwt is false in config.toml, so we just need a bearer token
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Always use service role key for data access across all users
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
        // Get assets with category info
        const { data: assets } = await supabase
          .from('assets')
          .select('total_cost, current_value, currency, category_code, asset_type')
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

        // Calculate totals and per-category breakdown
        // NOTE: MF holdings are already in the unified 'assets' table, no separate query needed
        let totalInvested = 0
        let totalValue = 0
        const categoryBreakdown: Record<string, { invested: number; value: number }> = {}

        const addToCategory = (cat: string, invested: number, value: number) => {
          if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { invested: 0, value: 0 }
          categoryBreakdown[cat].invested += invested
          categoryBreakdown[cat].value += value
        }

        for (const asset of assets || []) {
          const cost = Number(asset.total_cost) || 0
          const val = Number(asset.current_value) || cost
          const category = asset.category_code || asset.asset_type || 'other'
          
          let convertedCost = cost
          let convertedVal = val
          if (asset.currency === 'INR') {
            convertedCost = cost * inrToAed
            convertedVal = val * inrToAed
          }
          
          totalInvested += convertedCost
          totalValue += convertedVal
          addToCategory(category, convertedCost, convertedVal)
        }

        let totalLiabilities = 0
        for (const l of liabilities || []) {
          const out = Number(l.outstanding) || 0
          totalLiabilities += l.currency === 'INR' ? out * inrToAed : out
        }

        const netWorth = totalValue - totalLiabilities

        // Build breakdown_json: { category: value } for quick charting
        const breakdownJson: Record<string, number> = {}
        for (const [cat, vals] of Object.entries(categoryBreakdown)) {
          breakdownJson[cat] = Math.round(vals.value * 100) / 100
        }
        if (totalLiabilities > 0) {
          breakdownJson['liabilities'] = Math.round(-totalLiabilities * 100) / 100
        }

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
            breakdown_json: breakdownJson,
          }, { onConflict: 'user_id,snapshot_date' })

        if (upsertError) throw upsertError
        results.push({ user_id: userId, status: 'ok' })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        results.push({ user_id: userId, status: `error: ${msg}` })
      }
    }

    return new Response(JSON.stringify({ date: today, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
