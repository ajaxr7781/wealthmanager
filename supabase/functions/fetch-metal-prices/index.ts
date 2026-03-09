import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function fetchPrice(symbol: string) {
  const res = await fetch(`https://api.gold-api.com/price/${symbol}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`${symbol}: API status ${res.status}`);
  const data = await res.json();
  if (typeof data.price !== 'number') throw new Error(`${symbol}: invalid price`);
  return { symbol: data.symbol || symbol, name: data.name || symbol, price: data.price, updatedAt: data.updatedAt || '' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const [xau, xag] = await Promise.all([fetchPrice('XAU'), fetchPrice('XAG')]);

    // Auto-save to price_snapshots if service role is available (cron/server context)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && serviceKey) {
      try {
        // Get USD→AED rate from user_settings or use default
        const usdToAed = 3.6725; // Default rate
        const supabase = createClient(supabaseUrl, serviceKey);
        
        // Try to get a more current rate
        let fxRate = usdToAed;
        try {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('usd_to_aed_rate')
            .limit(1)
            .single();
          if (settings?.usd_to_aed_rate) {
            fxRate = Number(settings.usd_to_aed_rate);
          }
        } catch (_) {
          // Use default
        }

        const now = new Date().toISOString();
        const snapshots = [
          {
            instrument_symbol: 'XAU',
            price_aed_per_oz: xau.price * fxRate,
            source: 'gold-api-cron',
            as_of: now,
          },
          {
            instrument_symbol: 'XAG',
            price_aed_per_oz: xag.price * fxRate,
            source: 'gold-api-cron',
            as_of: now,
          },
        ];

        await supabase.from('price_snapshots').insert(snapshots);
        console.log(`Saved price snapshots: XAU=${(xau.price * fxRate).toFixed(2)} XAG=${(xag.price * fxRate).toFixed(2)} AED/oz`);
      } catch (saveErr) {
        console.error('Failed to save price snapshots:', saveErr);
        // Don't fail the whole request if save fails
      }
    }

    return new Response(JSON.stringify({ baseCurrency: 'USD', items: [xau, xag] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching metal prices:', error);
    const msg = error instanceof Error ? error.message : 'Failed to fetch metal prices';
    return new Response(JSON.stringify({ error: msg, baseCurrency: 'USD', items: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
