import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ForexRates {
  USD_AED: number;
  INR_AED: number;
  last_updated: string;
  source: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Primary: frankfurter.app (free, no API key, ECB rates)
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=AED,INR', {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`frankfurter.app responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('frankfurter.app response:', JSON.stringify(data));

    const usdToAed = data.rates?.AED;
    const usdToInr = data.rates?.INR;

    if (!usdToAed || !usdToInr) {
      throw new Error(`Missing rates in response: AED=${usdToAed}, INR=${usdToInr}`);
    }

    const inrToAed = usdToAed / usdToInr;

    const result: ForexRates = {
      USD_AED: Math.round(usdToAed * 10000) / 10000,
      INR_AED: Math.round(inrToAed * 100000) / 100000,
      last_updated: new Date().toISOString(),
      source: 'frankfurter.app',
    };

    console.log('Returning rates:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error fetching forex rates:', error);

    // Fallback: try open.er-api.com (free, no key)
    try {
      const fallbackRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!fallbackRes.ok) throw new Error(`er-api status: ${fallbackRes.status}`);
      const fallbackData = await fallbackRes.json();

      const usdToAed = fallbackData.rates?.AED;
      const usdToInr = fallbackData.rates?.INR;

      if (usdToAed && usdToInr) {
        const result: ForexRates = {
          USD_AED: Math.round(usdToAed * 10000) / 10000,
          INR_AED: Math.round((usdToAed / usdToInr) * 100000) / 100000,
          last_updated: new Date().toISOString(),
          source: 'open.er-api.com',
        };
        console.log('Fallback rates:', JSON.stringify(result));
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (fbErr) {
      console.error('Fallback also failed:', fbErr);
    }

    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch forex rates';
    return new Response(
      JSON.stringify({
        USD_AED: 3.6725,
        INR_AED: 0.044,
        last_updated: new Date().toISOString(),
        source: 'default',
        error: errorMessage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
