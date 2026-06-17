import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateRequest } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MFAPILatestResponse {
  meta: {
    fund_house: string
    scheme_type: string
    scheme_category: string
    scheme_code: number
    scheme_name: string
  }
  data: Array<{ date: string; nav: string }>
}

// Rate limiter
const rateLimiter = {
  tokens: 10,
  lastRefill: Date.now(),
  maxTokens: 10,
  refillRate: 1000,
  async acquire(): Promise<boolean> {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed / this.refillRate)
    this.lastRefill = now
    if (this.tokens >= 1) { this.tokens -= 1; return true }
    await new Promise(resolve => setTimeout(resolve, this.refillRate))
    return this.acquire()
  }
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rateLimiter.acquire()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'WealthMatrix/1.0' }
      })
      clearTimeout(timeoutId)
      if (response.ok) return response
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  throw lastError || new Error('Max retries exceeded')
}

function parseAmfiNav(text: string): Map<string, { nav: number; date: string }> {
  const result = new Map<string, { nav: number; date: string }>()
  const lines = text.split('\n')
  for (const line of lines) {
    const parts = line.split(';')
    if (parts.length >= 8) {
      const schemeCode = parts[0].trim()
      const isin = parts[1].trim()
      const navStr = parts[4].trim()
      const dateStr = parts[7].trim()
      const nav = parseFloat(navStr)
      if (!isNaN(nav) && nav > 0) {
        if (schemeCode && /^\d+$/.test(schemeCode)) {
          result.set(schemeCode, { nav, date: dateStr })
        }
        if (isin && isin.startsWith('INF')) {
          result.set(isin, { nav, date: dateStr })
        }
      }
    }
  }
  return result
}

function parseAmfiDate(dateStr: string): string {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  }
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}-${months[parts[1]] || '01'}-${parts[0].padStart(2, '0')}`
  }
  return dateStr
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Require authenticated user or trusted service/cron caller.
  const auth = await authenticateRequest(req)
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Create job log entry
  const { data: jobLog } = await supabase
    .from('sync_job_logs')
    .insert({ job_name: 'update-mf-nav', status: 'running' })
    .select('id')
    .single()

  const jobId = jobLog?.id

  try {
    // Determine if this is a cron call or user-triggered
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        // If triggered by user via UI, they pass user_id context
        if (body.user_id) userId = body.user_id
      } catch { /* no body */ }
    }

    // Get all unique scheme_ids that are actively used in holdings or SIPs across ALL users
    const { data: holdingSchemes } = await supabase
      .from('mf_holdings')
      .select('scheme_id')
      .eq('is_active', true)

    const { data: sipSchemes } = await supabase
      .from('mf_sips')
      .select('scheme_id')
      .in('status', ['ACTIVE', 'PAUSED'])

    const schemeIdSet = new Set<string>()
    holdingSchemes?.forEach(h => schemeIdSet.add(h.scheme_id))
    sipSchemes?.forEach(s => schemeIdSet.add(s.scheme_id))

    const activeSchemeIds = Array.from(schemeIdSet)

    if (activeSchemeIds.length === 0) {
      await supabase.from('sync_job_logs').update({
        status: 'success', completed_at: new Date().toISOString(),
        rows_processed: 0,
        metadata_json: { message: 'No active holdings or SIPs found' }
      }).eq('id', jobId)

      return new Response(JSON.stringify({
        success: true, message: 'No active schemes to update', updated: 0
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch the scheme details
    const { data: schemes, error: schemesError } = await supabase
      .from('mf_schemes')
      .select('id, amfi_scheme_code, isin, scheme_name')
      .in('id', activeSchemeIds)
      .eq('is_active', true)

    if (schemesError) throw schemesError
    if (!schemes || schemes.length === 0) throw new Error('No active schemes found')

    console.log(`Updating NAV for ${schemes.length} schemes (from holdings/SIPs)`)

    let successCount = 0
    let failedCount = 0
    let amfiData: Map<string, { nav: number; date: string }> | null = null
    const errors: string[] = []

    for (const scheme of schemes) {
      if (!scheme.amfi_scheme_code && !scheme.isin) {
        failedCount++
        errors.push(`${scheme.scheme_name}: no AMFI code or ISIN`)
        continue
      }

      let nav: number | null = null
      let navDate: string | null = null
      let source: string | null = null

      // Try MFAPI first
      if (scheme.amfi_scheme_code) {
        try {
          const response = await fetchWithRetry(
            `https://api.mfapi.in/mf/${scheme.amfi_scheme_code}/latest`
          )
          const data: MFAPILatestResponse = await response.json()
          if (data.data && data.data.length > 0) {
            const latest = data.data[0]
            nav = Math.round(parseFloat(latest.nav) * 100) / 100
            const [day, month, year] = latest.date.split('-')
            navDate = `${year}-${month}-${day}`
            source = 'MFAPI'
          }
        } catch (error) {
          console.log(`MFAPI failed for ${scheme.amfi_scheme_code}:`, error)
        }
      }

      // Fallback to AMFI NAVAll.txt
      if (!nav && (scheme.isin || scheme.amfi_scheme_code)) {
        try {
          if (!amfiData) {
            console.log('Fetching AMFI NAVAll.txt as fallback...')
            const response = await fetchWithRetry('https://www.amfiindia.com/spages/NAVAll.txt')
            const text = await response.text()
            amfiData = parseAmfiNav(text)
          }
          let navEntry = scheme.isin ? amfiData.get(scheme.isin) : null
          if (!navEntry && scheme.amfi_scheme_code) {
            navEntry = amfiData.get(scheme.amfi_scheme_code.toString())
          }
          if (navEntry) {
            nav = Math.round(navEntry.nav * 100) / 100
            navDate = parseAmfiDate(navEntry.date)
            source = 'AMFI'
          }
        } catch (error) {
          console.log(`AMFI fallback failed for ${scheme.id}:`, error)
        }
      }

      if (nav && navDate && source) {
        // Update scheme
        await supabase.from('mf_schemes').update({
          latest_nav: nav,
          latest_nav_date: navDate,
          nav_last_updated: new Date().toISOString(),
          nav_source: source,
          needs_verification: false
        }).eq('id', scheme.id)

        // Upsert NAV history
        await supabase.from('mf_nav_history').upsert({
          scheme_id: scheme.id,
          nav_date: navDate,
          nav_value: nav,
          source,
          fetched_at: new Date().toISOString()
        }, { onConflict: 'scheme_id,nav_date' })

        // Update holdings current value
        const { data: holdings } = await supabase
          .from('mf_holdings')
          .select('id, units_held, invested_amount')
          .eq('scheme_id', scheme.id)

        if (holdings) {
          for (const holding of holdings) {
            const currentValue = holding.units_held * nav
            const unrealizedGain = currentValue - holding.invested_amount
            const returnPct = holding.invested_amount > 0
              ? (unrealizedGain / holding.invested_amount) * 100
              : 0

            await supabase.from('mf_holdings').update({
              current_value: Math.round(currentValue * 100) / 100,
              unrealized_gain: Math.round(unrealizedGain * 100) / 100,
              absolute_return_pct: Math.round(returnPct * 100) / 100
            }).eq('id', holding.id)
          }
        }

        // Also update unified assets table for MF holdings
        const { data: linkedAssets } = await supabase.from('assets')
          .select('id, units_held')
          .eq('scheme_id', scheme.id)
          .in('asset_type', ['mutual_fund', 'sip'])

        if (linkedAssets) {
          for (const la of linkedAssets) {
            const assetCurrentValue = (Number(la.units_held) || 0) * nav
            await supabase.from('assets')
              .update({
                nav_or_price: nav,
                current_value: Math.round(assetCurrentValue * 100) / 100
              })
              .eq('id', la.id)
          }
        }

        successCount++
      } else {
        failedCount++
        errors.push(`${scheme.scheme_name}: NAV fetch failed`)
      }
    }

    const status = failedCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed'

    await supabase.from('sync_job_logs').update({
      status,
      completed_at: new Date().toISOString(),
      rows_processed: successCount,
      rows_failed: failedCount,
      error_message: errors.length > 0 ? errors.join('; ') : null,
      metadata_json: {
        total_schemes: schemes.length,
        success_count: successCount,
        failed_count: failedCount
      }
    }).eq('id', jobId)

    return new Response(JSON.stringify({
      success: true,
      total: schemes.length,
      success_count: successCount,
      failed_count: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Updated ${successCount}/${schemes.length} schemes`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in update-mf-nav:', error)

    if (jobId) {
      await supabase.from('sync_job_logs').update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: errMsg
      }).eq('id', jobId)
    }

    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
