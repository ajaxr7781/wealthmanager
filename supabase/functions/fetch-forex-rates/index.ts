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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch USD to AED and INR to AED rates from exchangerate.host API (free, no API key required)
    const [usdResponse, inrResponse] = await Promise.all([
      fetch('https://api.exchangerate.host/convert?from=USD&to=AED', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; InvestmentTracker/1.0)',
        },
      }),
      fetch('https://api.exchangerate.host/convert?from=INR&to=AED', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; InvestmentTracker/1.0)',
        },
      }),
    ]);

    // Fallback to frankfurter.app API if exchangerate.host fails
    if (!usdResponse.ok || !inrResponse.ok) {
      console.log('Primary API failed, trying fallback...');
      
      const fallbackResponse = await fetch('https://api.frankfurter.app/latest?from=USD&to=AED,INR', {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; InvestmentTracker/1.0)',
        },
      });

      if (!fallbackResponse.ok) {
        throw new Error(`Fallback API responded with status: ${fallbackResponse.status}`);
      }

      const fallbackData = await fallbackResponse.json();
      
      // Calculate INR to AED (via USD)
      const usdToAed = fallbackData.rates?.AED || 3.6725;
      const usdToInr = fallbackData.rates?.INR || 83.5;
      const inrToAed = usdToAed / usdToInr;

      const result: ForexRates = {
        USD_AED: usdToAed,
        INR_AED: inrToAed,
        last_updated: new Date().toISOString(),
        source: 'frankfurter.app',
      };

      return new Response(JSON.stringify(result), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const usdData = await usdResponse.json();
    const inrData = await inrResponse.json();

    const result: ForexRates = {
      USD_AED: usdData.result || usdData.info?.rate || 3.6725,
      INR_AED: inrData.result || inrData.info?.rate || 0.044,
      last_updated: new Date().toISOString(),
      source: 'exchangerate.host',
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching forex rates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch forex rates';
    
    // Return default rates on error
    return new Response(
      JSON.stringify({ 
        USD_AED: 3.6725,
        INR_AED: 0.044,
        last_updated: new Date().toISOString(),
        source: 'default',
        error: errorMessage,
      }),
      {
        status: 200, // Return 200 with defaults so app doesn't break
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
