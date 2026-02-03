import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NavResult {
  scheme_id: string
  scheme_code: number
  nav: number | null
  nav_date: string | null
  source: 'MFAPI' | 'AMFI' | null
  success: boolean
  error?: string
}

interface MFAPILatestResponse {
  meta: {
    fund_house: string
    scheme_type: string
    scheme_category: string
    scheme_code: number
    scheme_name: string
  }
  data: Array<{
    date: string
    nav: string
  }>
}

// Rate limiter - simple token bucket
const rateLimiter = {
  tokens: 10,
  lastRefill: Date.now(),
  maxTokens: 10,
  refillRate: 1000, // 1 second per token

  async acquire(): Promise<boolean> {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed / this.refillRate)
    this.lastRefill = now

    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }

    // Wait for a token
    await new Promise(resolve => setTimeout(resolve, this.refillRate))
    return this.acquire()
  }
}

// Fetch with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await rateLimiter.acquire()
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'InvestTracker/1.0',
          ...options.headers
        }
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        return response
      }
      
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
    }
    
    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
  
  throw lastError || new Error('Max retries exceeded')
}

// Parse AMFI NAVAll.txt format
function parseAmfiNav(text: string): Map<string, { nav: number; date: string; name: string }> {
  const result = new Map<string, { nav: number; date: string; name: string }>()
  const lines = text.split('\n')
  
  for (const line of lines) {
    const parts = line.split(';')
    // Format: Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Repurchase Price;Sale Price;Date
    if (parts.length >= 8) {
      const schemeCode = parts[0].trim()
      const isin = parts[1].trim() // Primary ISIN (Growth/Payout)
      const schemeName = parts[3].trim()
      const navStr = parts[4].trim()
      const dateStr = parts[7].trim()
      
      const nav = parseFloat(navStr)
      if (!isNaN(nav) && nav > 0) {
        // Store by scheme code
        if (schemeCode && /^\d+$/.test(schemeCode)) {
          result.set(schemeCode, { nav, date: dateStr, name: schemeName })
        }
        // Also store by ISIN
        if (isin && isin.startsWith('INF')) {
          result.set(isin, { nav, date: dateStr, name: schemeName })
        }
      }
    }
  }
  
  return result
}

// Convert DD-Mon-YYYY to YYYY-MM-DD
function parseAmfiDate(dateStr: string): string {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  }
  
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = months[parts[1]] || '01'
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  
  return dateStr
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Parse request
    let schemeIds: string[] = []
    let refreshAll = false

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        schemeIds = body.scheme_ids || []
        refreshAll = body.refresh_all === true
      } catch {
        // Use defaults
      }
    }

    // Get user's schemes to refresh
    let query = supabase
      .from('mf_schemes')
      .select('id, amfi_scheme_code, isin, scheme_name')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (!refreshAll && schemeIds.length > 0) {
      query = query.in('id', schemeIds)
    }

    const { data: schemes, error: schemesError } = await query

    if (schemesError) {
      throw schemesError
    }

    if (!schemes || schemes.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No schemes to refresh',
        results: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Refreshing NAV for ${schemes.length} schemes`)

    const results: NavResult[] = []
    let amfiData: Map<string, { nav: number; date: string; name: string }> | null = null

    for (const scheme of schemes) {
      const result: NavResult = {
        scheme_id: scheme.id,
        scheme_code: scheme.amfi_scheme_code,
        nav: null,
        nav_date: null,
        source: null,
        success: false
      }

      // Skip if no mapping
      if (!scheme.amfi_scheme_code && !scheme.isin) {
        result.error = 'Scheme needs mapping - no AMFI code or ISIN'
        results.push(result)
        continue
      }

      // Try MFAPI first
      if (scheme.amfi_scheme_code) {
        try {
          const response = await fetchWithRetry(
            `https://api.mfapi.in/mf/${scheme.amfi_scheme_code}/latest`
          )
          const data: MFAPILatestResponse = await response.json()
          
          if (data.data && data.data.length > 0) {
            const latest = data.data[0]
            result.nav = parseFloat(latest.nav)
            // Convert date from DD-MM-YYYY to YYYY-MM-DD
            const [day, month, year] = latest.date.split('-')
            result.nav_date = `${year}-${month}-${day}`
            result.source = 'MFAPI'
            result.success = true
          }
        } catch (error) {
          console.log(`MFAPI failed for ${scheme.amfi_scheme_code}:`, error)
        }
      }

      // Fallback to AMFI NAVAll.txt
      if (!result.success && (scheme.isin || scheme.amfi_scheme_code)) {
        try {
          // Lazy load AMFI data
          if (!amfiData) {
            console.log('Fetching AMFI NAVAll.txt as fallback...')
            const response = await fetchWithRetry(
              'https://www.amfiindia.com/spages/NAVAll.txt'
            )
            const text = await response.text()
            amfiData = parseAmfiNav(text)
            console.log(`Parsed ${amfiData.size} schemes from AMFI`)
          }

          // Try ISIN first, then scheme code
          let navData = scheme.isin ? amfiData.get(scheme.isin) : null
          if (!navData && scheme.amfi_scheme_code) {
            navData = amfiData.get(scheme.amfi_scheme_code.toString())
          }

          if (navData) {
            result.nav = navData.nav
            result.nav_date = parseAmfiDate(navData.date)
            result.source = 'AMFI'
            result.success = true
          }
        } catch (error) {
          console.log(`AMFI fallback failed for ${scheme.id}:`, error)
          result.error = 'Both MFAPI and AMFI failed'
        }
      }

      // Update scheme in database if successful
      if (result.success && result.nav && result.nav_date) {
        const { error: updateError } = await supabase
          .from('mf_schemes')
          .update({
            latest_nav: result.nav,
            latest_nav_date: result.nav_date,
            nav_last_updated: new Date().toISOString(),
            nav_source: result.source,
            needs_verification: false
          })
          .eq('id', scheme.id)

        if (updateError) {
          console.error(`Failed to update scheme ${scheme.id}:`, updateError)
        }

        // Insert into NAV history (upsert to handle duplicates)
        await supabase
          .from('mf_nav_history')
          .upsert({
            scheme_id: scheme.id,
            nav_date: result.nav_date,
            nav_value: result.nav,
            source: result.source,
            fetched_at: new Date().toISOString()
          }, { onConflict: 'scheme_id,nav_date' })

        // Update holdings current value
        const { data: holdings } = await supabase
          .from('mf_holdings')
          .select('id, units_held, invested_amount')
          .eq('scheme_id', scheme.id)

        if (holdings) {
          for (const holding of holdings) {
            const currentValue = holding.units_held * result.nav
            const unrealizedGain = currentValue - holding.invested_amount
            const returnPct = holding.invested_amount > 0 
              ? (unrealizedGain / holding.invested_amount) * 100 
              : 0

            await supabase
              .from('mf_holdings')
              .update({
                current_value: Math.round(currentValue * 100) / 100,
                unrealized_gain: Math.round(unrealizedGain * 100) / 100,
                absolute_return_pct: Math.round(returnPct * 100) / 100
              })
              .eq('id', holding.id)
          }
        }
      }

      results.push(result)
    }

    const successCount = results.filter(r => r.success).length

    return new Response(JSON.stringify({
      success: true,
      total: results.length,
      success_count: successCount,
      failed_count: results.length - successCount,
      results,
      message: `Updated ${successCount}/${results.length} schemes`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in fetch-mf-nav:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
