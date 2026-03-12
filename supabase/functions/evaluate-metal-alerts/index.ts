import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MetalAlertRule {
  id: string;
  user_id: string;
  metal_type: string;
  rule_name: string;
  rule_type: string;
  operator: string;
  threshold_value: number;
  reference_window_days: number;
  suggested_action: string;
  suggested_amount_type: string;
  suggested_amount_value: number;
  cooldown_hours: number;
  is_active: boolean;
  send_email: boolean;
  last_triggered_at: string | null;
}

interface PortfolioData {
  totalQtyOz: number;
  totalInvested: number;
  currentValue: number;
  avgCostPerOz: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
}

function compare(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'eq': return Math.abs(value - threshold) < 0.01;
    default: return false;
  }
}

function isInCooldown(lastTriggered: string | null, cooldownHours: number): boolean {
  if (!lastTriggered) return false;
  const last = new Date(lastTriggered).getTime();
  const now = Date.now();
  return (now - last) < cooldownHours * 60 * 60 * 1000;
}

/** Returns market session info for Dubai timezone (Asia/Dubai UTC+4) */
function getMarketSession(): { session: string; label: string } {
  const dubaiHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai', hour: 'numeric', hour12: false });
  const hour = parseInt(dubaiHour, 10);
  
  if (hour >= 16 || hour === 0) {
    // 16:00–00:00 Dubai — peak international markets overlap
    return { session: 'market_priority', label: 'Market Priority (16:00–00:00 Dubai)' };
  } else if (hour >= 6) {
    // 06:00–16:00 Dubai — standard business hours
    return { session: 'standard', label: 'Standard Hours (06:00–16:00 Dubai)' };
  } else {
    // 00:00–06:00 Dubai — low activity
    return { session: 'low_activity', label: 'Low Activity (00:00–06:00 Dubai)' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const targetUserId = body.user_id;
    const marketSession = getMarketSession();

    console.log(`Evaluating metal alerts — session: ${marketSession.label}`);

    // 1. Get all active metal alert rules
    let rulesQuery = supabase
      .from('metal_alert_rules')
      .select('*')
      .eq('is_active', true);

    if (targetUserId) {
      rulesQuery = rulesQuery.eq('user_id', targetUserId);
    }

    const { data: rules, error: rulesError } = await rulesQuery;
    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ evaluated: 0, triggered: 0, session: marketSession.session }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get latest prices for XAU and XAG
    const prices: Record<string, number> = {};
    for (const symbol of ['XAU', 'XAG']) {
      const { data: priceData } = await supabase
        .from('price_snapshots')
        .select('price_aed_per_oz')
        .eq('instrument_symbol', symbol)
        .order('as_of', { ascending: false })
        .limit(1);
      if (priceData?.[0]) {
        prices[symbol] = Number(priceData[0].price_aed_per_oz);
      }
    }

    // 3. Get price history for drop/rise % calculations
    const priceHistory: Record<string, number[]> = { XAU: [], XAG: [] };
    for (const symbol of ['XAU', 'XAG']) {
      const { data: history } = await supabase
        .from('price_snapshots')
        .select('price_aed_per_oz')
        .eq('instrument_symbol', symbol)
        .order('as_of', { ascending: false })
        .limit(100);
      if (history) {
        priceHistory[symbol] = history.map(h => Number(h.price_aed_per_oz));
      }
    }

    // 4. Group rules by user for portfolio calculations
    const userIds = [...new Set(rules.map(r => r.user_id))];
    const userPortfolios: Record<string, Record<string, PortfolioData>> = {};

    for (const userId of userIds) {
      const { data: assets } = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', userId)
        .eq('asset_type', 'precious_metals');

      userPortfolios[userId] = {};
      for (const metal of ['XAU', 'XAG']) {
        const metalAssets = (assets || []).filter((a: any) => a.metal_type === metal);
        let totalQtyOz = 0;
        let totalInvested = 0;

        for (const a of metalAssets) {
          const qty = Number(a.quantity || 0);
          const unit = (a.quantity_unit || 'oz').toLowerCase();
          totalQtyOz += (unit === 'grams' || unit === 'gram' || unit === 'g') ? qty / 31.1035 : qty;
          totalInvested += Number(a.total_cost || 0);
        }

        const currentPrice = prices[metal] || 0;
        const currentValue = totalQtyOz * currentPrice;
        const avgCostPerOz = totalQtyOz > 0 ? totalInvested / totalQtyOz : 0;
        const unrealizedPl = currentValue - totalInvested;
        const unrealizedPlPct = totalInvested > 0 ? (unrealizedPl / totalInvested) * 100 : 0;

        userPortfolios[userId][metal] = {
          totalQtyOz, totalInvested, currentValue, avgCostPerOz, unrealizedPl, unrealizedPlPct,
        };
      }

      // Total portfolio value for allocation rules
      const { data: allAssets } = await supabase
        .from('assets')
        .select('total_cost, current_value, asset_type, metal_type, quantity, quantity_unit, currency')
        .eq('user_id', userId);

      let totalPortfolioValue = 0;
      for (const a of (allAssets || [])) {
        if (a.asset_type === 'precious_metals' && a.metal_type) {
          const priceAed = prices[a.metal_type] || 0;
          const qty = Number(a.quantity || 0);
          const unit = (a.quantity_unit || 'oz').toLowerCase();
          const qtyOz = (unit === 'grams' || unit === 'gram' || unit === 'g') ? qty / 31.1035 : qty;
          totalPortfolioValue += qtyOz * priceAed;
        } else {
          totalPortfolioValue += Number(a.current_value || a.total_cost || 0);
        }
      }
      (userPortfolios[userId] as any)._totalPortfolioValue = totalPortfolioValue;
    }

    // 5. Evaluate each rule
    const triggered: any[] = [];
    let evaluated = 0;

    for (const rule of rules as MetalAlertRule[]) {
      evaluated++;
      const currentPrice = prices[rule.metal_type];
      if (!currentPrice) continue;

      // Cooldown check
      if (isInCooldown(rule.last_triggered_at, rule.cooldown_hours)) continue;

      const portfolio = userPortfolios[rule.user_id]?.[rule.metal_type];
      if (!portfolio) continue;

      let shouldTrigger = false;
      let triggerReason = '';

      switch (rule.rule_type) {
        case 'price_below':
          shouldTrigger = compare(currentPrice, rule.operator, rule.threshold_value);
          triggerReason = `${rule.metal_type} price AED ${currentPrice.toFixed(2)}/oz is below threshold AED ${rule.threshold_value}/oz`;
          break;

        case 'price_above':
          shouldTrigger = compare(currentPrice, rule.operator, rule.threshold_value);
          triggerReason = `${rule.metal_type} price AED ${currentPrice.toFixed(2)}/oz is above threshold AED ${rule.threshold_value}/oz`;
          break;

        case 'price_drop_pct': {
          const history = priceHistory[rule.metal_type] || [];
          const windowPrices = history.slice(0, Math.min(history.length, rule.reference_window_days));
          if (windowPrices.length > 1) {
            const recentHigh = Math.max(...windowPrices);
            const dropPct = ((recentHigh - currentPrice) / recentHigh) * 100;
            shouldTrigger = compare(dropPct, rule.operator, rule.threshold_value);
            triggerReason = `${rule.metal_type} dropped ${dropPct.toFixed(1)}% from recent high AED ${recentHigh.toFixed(2)}/oz`;
          }
          break;
        }

        case 'price_rise_pct': {
          const history = priceHistory[rule.metal_type] || [];
          const windowPrices = history.slice(0, Math.min(history.length, rule.reference_window_days));
          if (windowPrices.length > 1) {
            const recentLow = Math.min(...windowPrices);
            const risePct = ((currentPrice - recentLow) / recentLow) * 100;
            shouldTrigger = compare(risePct, rule.operator, rule.threshold_value);
            triggerReason = `${rule.metal_type} rose ${risePct.toFixed(1)}% from recent low AED ${recentLow.toFixed(2)}/oz`;
          }
          break;
        }

        case 'portfolio_profit_above':
          shouldTrigger = compare(portfolio.unrealizedPl, rule.operator, rule.threshold_value);
          triggerReason = `${rule.metal_type} unrealized profit AED ${portfolio.unrealizedPl.toFixed(2)} exceeds threshold AED ${rule.threshold_value}`;
          break;

        case 'portfolio_loss_above':
          shouldTrigger = compare(Math.abs(portfolio.unrealizedPl), rule.operator, rule.threshold_value) && portfolio.unrealizedPl < 0;
          triggerReason = `${rule.metal_type} unrealized loss AED ${Math.abs(portfolio.unrealizedPl).toFixed(2)} exceeds threshold AED ${rule.threshold_value}`;
          break;

        case 'position_pl_pct':
          shouldTrigger = compare(Math.abs(portfolio.unrealizedPlPct), rule.operator, rule.threshold_value);
          triggerReason = `${rule.metal_type} position P/L ${portfolio.unrealizedPlPct.toFixed(1)}% exceeds threshold ${rule.threshold_value}%`;
          break;

        case 'allocation_pct_above': {
          const totalPortValue = (userPortfolios[rule.user_id] as any)?._totalPortfolioValue || 0;
          if (totalPortValue > 0) {
            const allocationPct = (portfolio.currentValue / totalPortValue) * 100;
            shouldTrigger = compare(allocationPct, rule.operator, rule.threshold_value);
            triggerReason = `${rule.metal_type} allocation ${allocationPct.toFixed(1)}% exceeds threshold ${rule.threshold_value}%`;
          }
          break;
        }
      }

      if (shouldTrigger) {
        const metalLabel = rule.metal_type === 'XAU' ? 'Gold' : 'Silver';
        const actionLabel = rule.suggested_action === 'buy' ? 'buy zone reached' : rule.suggested_action === 'sell' ? 'profit target reached' : 'hold signal';
        const emailSubject = `${metalLabel} ${actionLabel} — ${rule.rule_name}`;

        const emailBody = buildEmailBody({
          metalLabel,
          currentPrice,
          portfolio,
          rule,
          triggerReason,
        });

        // Insert event
        const { data: event, error: eventError } = await supabase
          .from('metal_alert_events')
          .insert({
            rule_id: rule.id,
            user_id: rule.user_id,
            metal_type: rule.metal_type,
            trigger_reason: triggerReason,
            market_price_aed: currentPrice,
            portfolio_value_aed: portfolio.currentValue,
            total_invested_aed: portfolio.totalInvested,
            unrealized_pl_aed: portfolio.unrealizedPl,
            unrealized_pl_pct: portfolio.unrealizedPlPct,
            email_sent: false,
            email_subject: emailSubject,
            email_body: emailBody,
            status: 'triggered',
          })
          .select('id')
          .single();

        if (eventError) {
          console.error('Failed to insert event:', eventError);
          continue;
        }

        // Update last_triggered_at
        await supabase
          .from('metal_alert_rules')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', rule.id);

        // Send email ONLY if rule has send_email enabled AND global email is enabled
        if (rule.send_email) {
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', rule.user_id)
            .single();

          const emailEnabled = prefs?.email_enabled !== false;

          if (emailEnabled) {
            // Get recipient email
            let recipientEmail = prefs?.recipient_email;
            if (!recipientEmail) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('email')
                .eq('user_id', rule.user_id)
                .single();
              recipientEmail = profile?.email;
            }

            if (recipientEmail) {
              try {
                const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-metal-alert-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${serviceKey}`,
                  },
                  body: JSON.stringify({
                    to: recipientEmail,
                    subject: emailSubject,
                    html: emailBody,
                    event_id: event.id,
                  }),
                });

                if (sendRes.ok) {
                  await supabase
                    .from('metal_alert_events')
                    .update({ email_sent: true, sent_at: new Date().toISOString(), status: 'email_sent' })
                    .eq('id', event.id);
                } else {
                  const errBody = await sendRes.text();
                  console.error('Email send failed:', errBody);
                  await supabase
                    .from('metal_alert_events')
                    .update({ status: 'email_failed' })
                    .eq('id', event.id);
                }
              } catch (emailErr) {
                console.error('Email send error:', emailErr);
                await supabase
                  .from('metal_alert_events')
                  .update({ status: 'email_failed' })
                  .eq('id', event.id);
              }
            }
          }
        }

        triggered.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          metal: rule.metal_type,
          reason: triggerReason,
          session: marketSession.session,
        });
      }
    }

    return new Response(JSON.stringify({
      evaluated,
      triggered: triggered.length,
      details: triggered,
      session: marketSession.session,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error evaluating metal alerts:', error);
    const msg = error instanceof Error ? error.message : 'Failed to evaluate alerts';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildEmailBody(params: {
  metalLabel: string;
  currentPrice: number;
  portfolio: PortfolioData;
  rule: MetalAlertRule;
  triggerReason: string;
}): string {
  const { metalLabel, currentPrice, portfolio, rule, triggerReason } = params;
  const actionColor = rule.suggested_action === 'buy' ? '#22c55e' : rule.suggested_action === 'sell' ? '#ef4444' : '#f59e0b';
  const actionLabel = escHtml(rule.suggested_action.toUpperCase());
  const amountLabel = `${rule.suggested_amount_value} ${escHtml(rule.suggested_amount_type.toUpperCase())}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:24px;color:white;">
        <h1 style="margin:0;font-size:20px;">⚡ ${escHtml(metalLabel)} Alert</h1>
        <p style="margin:8px 0 0;opacity:0.8;font-size:14px;">${escHtml(rule.rule_name)}</p>
      </div>
      
      <!-- Action Badge -->
      <div style="padding:16px 24px;border-bottom:1px solid #e5e7eb;">
        <span style="display:inline-block;background:${actionColor};color:white;padding:6px 16px;border-radius:20px;font-weight:600;font-size:14px;">
          Suggested: ${actionLabel} ${amountLabel}
        </span>
      </div>

      <!-- Market Data -->
      <div style="padding:24px;">
        <h2 style="margin:0 0 16px;font-size:16px;color:#374151;">Market Snapshot</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Current Price</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;">AED ${currentPrice.toFixed(2)}/oz</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Your Avg Cost</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;">AED ${portfolio.avgCostPerOz.toFixed(2)}/oz</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Quantity Held</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;">${portfolio.totalQtyOz.toFixed(4)} oz</td>
          </tr>
          <tr style="border-top:1px solid #e5e7eb;">
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Total Invested</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;">AED ${portfolio.totalInvested.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Current Value</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;">AED ${portfolio.currentValue.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Unrealized P/L</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;font-size:14px;color:${portfolio.unrealizedPl >= 0 ? '#22c55e' : '#ef4444'};">
              ${portfolio.unrealizedPl >= 0 ? '+' : ''}AED ${portfolio.unrealizedPl.toFixed(2)} (${portfolio.unrealizedPlPct >= 0 ? '+' : ''}${portfolio.unrealizedPlPct.toFixed(1)}%)
            </td>
          </tr>
        </table>
      </div>

      <!-- Trigger Reason -->
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:13px;color:#6b7280;">
          <strong>Why this triggered:</strong> ${escHtml(triggerReason)}
        </p>
      </div>

      <!-- Footer -->
      <div style="padding:16px 24px;background:#f1f5f9;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">
          WealthMatrix • Automated Metal Alert • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
