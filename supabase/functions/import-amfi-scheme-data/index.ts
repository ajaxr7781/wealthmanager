import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedScheme {
  scheme_code: number
  isin: string
  scheme_name: string
  fund_house: string
}

// Parse AMFI scheme data
// Format: AMC,Code,Scheme Name,Scheme Type,Scheme Category,Scheme NAV Name,Scheme Minimum Amount,Launch Date,Closure Date,ISIN...
function parseAmfiSchemeData(text: string): ParsedScheme[] {
  const schemes: ParsedScheme[] = []
  const lines = text.split('\n')
  
  console.log(`Processing ${lines.length} lines from AMFI data`)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim().replace(/\r$/, '')
    
    // Skip empty lines and header row
    if (!trimmed) continue
    if (i === 0 && trimmed.startsWith('AMC,')) continue
    
    // Parse CSV row
    const parts = trimmed.split(',')
    
    if (parts.length >= 10) {
      const fundHouse = parts[0]?.trim() || ''
      const schemeCodeStr = parts[1]?.trim() || ''
      const schemeCode = parseInt(schemeCodeStr)
      const schemeName = parts[5]?.trim() || parts[2]?.trim() || '' // NAV Name or Scheme Name
      const isinField = parts[9]?.trim() || ''
      
      // Extract ISIN (may have multiple ISINs concatenated)
      let isin = ''
      if (isinField.startsWith('INF') && isinField.length >= 12) {
        isin = isinField.substring(0, 12)
      }
      
      if (!isNaN(schemeCode) && schemeCode > 0 && schemeName) {
        schemes.push({
          scheme_code: schemeCode,
          isin,
          scheme_name: schemeName,
          fund_house: fundHouse
        })
      }
    }
  }
  
  console.log(`Parsed ${schemes.length} schemes, ${schemes.filter(s => s.isin).length} with ISIN`)
  if (schemes.length > 0) {
    console.log('Sample scheme:', JSON.stringify(schemes[0]))
  }
  
  return schemes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request
    let force = false
    let autoMapUserSchemes = false
    let userId: string | null = null

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        force = body.force === true
        autoMapUserSchemes = body.auto_map === true
        
        // Get user for auto-mapping
        if (autoMapUserSchemes) {
          const authHeader = req.headers.get('Authorization')
          if (authHeader) {
            const token = authHeader.replace('Bearer ', '')
            const { data: { user } } = await supabase.auth.getUser(token)
            userId = user?.id || null
          }
        }
      } catch {
        // Use defaults
      }
    }

    // Check cache age
    const { data: latestCache } = await supabase
      .from('mf_scheme_master_cache')
      .select('cached_at')
      .eq('source', 'AMFI_CSV')
      .order('cached_at', { ascending: false })
      .limit(1)
      .single()

    const cacheAge = latestCache 
      ? (Date.now() - new Date(latestCache.cached_at).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    // Only refresh if cache is >30 days old or force=true
    if (cacheAge < 30 && !force) {
      return new Response(JSON.stringify({
        success: true,
        source: 'cache',
        cache_age_days: Math.round(cacheAge * 10) / 10,
        message: `AMFI data cache is ${Math.round(cacheAge)} days old. Use force=true to refresh.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch AMFI scheme data
    console.log('Fetching AMFI scheme data...')
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

    const response = await fetch(
      'https://portal.amfiindia.com/DownloadSchemeData_Po.aspx?mf=0',
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      }
    )
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`AMFI returned ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    console.log(`AMFI response length: ${text.length} chars`)
    console.log(`First 500 chars: ${text.substring(0, 500)}`)
    
    const schemes = parseAmfiSchemeData(text)
    console.log(`Parsed ${schemes.length} schemes from AMFI data`)

    // Store in cache
    const timestamp = new Date().toISOString()
    const batchSize = 500
    let insertedCount = 0

    // Delete old AMFI_CSV entries
    await supabase
      .from('mf_scheme_master_cache')
      .delete()
      .eq('source', 'AMFI_CSV')

    // Insert new entries with ISIN
    const schemesWithIsin = schemes.filter(s => s.isin)
    
    for (let i = 0; i < schemesWithIsin.length; i += batchSize) {
      const batch = schemesWithIsin.slice(i, i + batchSize).map(s => ({
        scheme_code: s.scheme_code,
        scheme_name: s.scheme_name,
        isin: s.isin,
        fund_house: s.fund_house,
        cached_at: timestamp,
        source: 'AMFI_CSV'
      }))

      const { error: insertError } = await supabase
        .from('mf_scheme_master_cache')
        .upsert(batch, { onConflict: 'scheme_code,source' })

      if (!insertError) {
        insertedCount += batch.length
      } else {
        console.error('Batch insert error:', insertError)
      }
    }

    console.log(`Cached ${insertedCount} schemes with ISIN`)

    // Auto-map user schemes if requested
    let mappedCount = 0
    if (autoMapUserSchemes && userId) {
      const { data: userSchemes } = await supabase
        .from('mf_schemes')
        .select('id, isin')
        .eq('user_id', userId)
        .eq('needs_verification', true)
        .not('isin', 'is', null)

      if (userSchemes) {
        for (const userScheme of userSchemes) {
          if (userScheme.isin) {
            const match = schemes.find(s => s.isin === userScheme.isin)
            if (match) {
              const { error } = await supabase
                .from('mf_schemes')
                .update({
                  amfi_scheme_code: match.scheme_code,
                  fund_house: match.fund_house || undefined,
                  needs_verification: false
                })
                .eq('id', userScheme.id)

              if (!error) mappedCount++
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      source: 'amfi',
      total_parsed: schemes.length,
      cached_with_isin: insertedCount,
      auto_mapped: mappedCount,
      message: `Imported ${insertedCount} schemes with ISIN from AMFI. ${mappedCount > 0 ? `Auto-mapped ${mappedCount} user schemes.` : ''}`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in import-amfi-scheme-data:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
