import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
