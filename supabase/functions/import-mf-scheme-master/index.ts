import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MFAPIScheme {
  schemeCode: number
  schemeName: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body for options
    let force = false
    let searchTerm = ''
    
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        force = body.force === true
        searchTerm = body.search || ''
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    // Check if we need to refresh the cache
    const { data: latestCache } = await supabase
      .from('mf_scheme_master_cache')
      .select('cached_at')
      .eq('source', 'MFAPI')
      .order('cached_at', { ascending: false })
      .limit(1)
      .single()

    const cacheAge = latestCache 
      ? (Date.now() - new Date(latestCache.cached_at).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity

    // Only refresh if cache is >30 days old or force=true
    if (cacheAge < 30 && !force) {
      // Return cached data with optional search
      let query = supabase
        .from('mf_scheme_master_cache')
        .select('scheme_code, scheme_name, isin, fund_house, cached_at')
        .eq('source', 'MFAPI')
        .order('scheme_name')

      if (searchTerm) {
        query = query.ilike('scheme_name', `%${searchTerm}%`)
      }

      const { data: cachedSchemes, error: cacheError } = await query.limit(100)

      if (cacheError) throw cacheError

      return new Response(JSON.stringify({
        success: true,
        source: 'cache',
        cache_age_days: Math.round(cacheAge * 10) / 10,
        count: cachedSchemes?.length || 0,
        schemes: cachedSchemes || [],
        message: `Returned ${cachedSchemes?.length || 0} schemes from cache (${Math.round(cacheAge)} days old)`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch fresh data from MFAPI with retry logic
    console.log('Fetching scheme master from MFAPI...')
    
    let schemes: MFAPIScheme[] = []
    let lastError: Error | null = null
    const maxRetries = 3
    const retryDelays = [1000, 2000, 4000] // exponential backoff
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const response = await fetch('https://api.mfapi.in/mf', {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'InvestTracker/1.0'
          }
        })
        
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`MFAPI returned ${response.status}: ${response.statusText}`)
        }

        schemes = await response.json()
        console.log(`Fetched ${schemes.length} schemes from MFAPI`)
        lastError = null
        break // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message)
        
        if (attempt < maxRetries - 1) {
          console.log(`Retrying in ${retryDelays[attempt]}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]))
        }
      }
    }

    // If all retries failed, check if we have cached data to return
    if (lastError && schemes.length === 0) {
      // Try to return existing cache even if stale
      const { data: staleCache, error: staleCacheError } = await supabase
        .from('mf_scheme_master_cache')
        .select('scheme_code, scheme_name, isin, fund_house, cached_at')
        .eq('source', 'MFAPI')
        .order('scheme_name')
        .limit(searchTerm ? 100 : 50)
      
      if (!staleCacheError && staleCache && staleCache.length > 0) {
        let resultSchemes = staleCache
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase()
          resultSchemes = staleCache.filter(s => 
            s.scheme_name.toLowerCase().includes(searchLower)
          )
        }
        
        return new Response(JSON.stringify({
          success: true,
          source: 'stale_cache',
          warning: `MFAPI unavailable: ${lastError.message}. Returning stale cache.`,
          count: resultSchemes.length,
          schemes: resultSchemes,
          message: `MFAPI unavailable. Returned ${resultSchemes.length} schemes from stale cache.`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // No cache available, return error
      throw lastError
    }

    // Clear old MFAPI cache entries and insert new ones
    // Do this in batches to avoid timeout
    const batchSize = 1000
    const timestamp = new Date().toISOString()

    // Delete old MFAPI entries
    await supabase
      .from('mf_scheme_master_cache')
      .delete()
      .eq('source', 'MFAPI')

    // Insert in batches
    let insertedCount = 0
    for (let i = 0; i < schemes.length; i += batchSize) {
      const batch = schemes.slice(i, i + batchSize).map(s => ({
        scheme_code: s.schemeCode,
        scheme_name: s.schemeName,
        cached_at: timestamp,
        source: 'MFAPI'
      }))

      const { error: insertError } = await supabase
        .from('mf_scheme_master_cache')
        .upsert(batch, { onConflict: 'scheme_code,source' })

      if (insertError) {
        console.error(`Batch insert error at ${i}:`, insertError)
      } else {
        insertedCount += batch.length
      }
    }

    console.log(`Inserted ${insertedCount} schemes into cache`)

    // Return search results if search term provided
    let resultSchemes = schemes
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      resultSchemes = schemes.filter(s => 
        s.schemeName.toLowerCase().includes(searchLower)
      ).slice(0, 100)
    } else {
      resultSchemes = schemes.slice(0, 100)
    }

    return new Response(JSON.stringify({
      success: true,
      source: 'mfapi',
      total_schemes: schemes.length,
      cached_count: insertedCount,
      count: resultSchemes.length,
      schemes: resultSchemes.map(s => ({
        scheme_code: s.schemeCode,
        scheme_name: s.schemeName
      })),
      message: `Refreshed cache with ${insertedCount} schemes from MFAPI`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in import-mf-scheme-master:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to import scheme master'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
