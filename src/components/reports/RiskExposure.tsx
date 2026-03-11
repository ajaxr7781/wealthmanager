import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowUpRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { PortfolioOverview, Asset } from '@/types/assets';
import { cn } from '@/lib/utils';

interface RiskExposureProps {
  overview: PortfolioOverview;
  assets: Asset[];
}

function formatAED(v: number) {
  return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function RiskExposure({ overview, assets }: RiskExposureProps) {
  const total = overview.total_current_value;

  // Classify into risk buckets
  let equity = 0, fixedIncome = 0, gold = 0, realEstate = 0, other = 0;
  for (const a of assets) {
    const val = Number(a.current_value) || Number(a.total_cost) || 0;
    const cat = a.category_code || a.asset_type;
    if (['shares', 'mutual_fund', 'sip'].includes(cat) || cat === 'equity_market') {
      equity += val;
    } else if (['fixed_deposit'].includes(cat) || cat === 'banking_fi') {
      fixedIncome += val;
    } else if (cat === 'precious_metals') {
      gold += val;
    } else if (cat === 'real_estate' || cat === 'real_assets') {
      realEstate += val;
    } else {
      other += val;
    }
  }

  // MF/SIP equity values are now included in assets_by_type

  const riskData = [
    { name: 'Equity', value: equity, color: 'hsl(217, 91%, 60%)' },
    { name: 'Fixed Income', value: fixedIncome, color: 'hsl(142, 71%, 45%)' },
    { name: 'Gold', value: gold, color: 'hsl(43, 74%, 49%)' },
    { name: 'Real Estate', value: realEstate, color: 'hsl(25, 95%, 53%)' },
    { name: 'Other', value: other, color: 'hsl(280, 65%, 60%)' },
  ].filter(d => d.value > 0);

  const riskTotal = riskData.reduce((s, d) => s + d.value, 0);

  // Currency exposure
  let inrExposure = 0, aedExposure = 0;
  for (const a of assets) {
    const val = Number(a.current_value) || Number(a.total_cost) || 0;
    if (a.currency === 'INR') inrExposure += val;
    else aedExposure += val;
  }
  // MF/SIP INR values now included in assets

  const currencyData = [
    { name: 'AED', value: aedExposure, color: 'hsl(217, 91%, 60%)' },
    { name: 'INR', value: inrExposure, color: 'hsl(25, 95%, 53%)' },
  ].filter(d => d.value > 0);
  const currTotal = currencyData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Asset Class Risk */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Asset Class Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            {riskData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={riskData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {riskData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatAED(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {riskData.map(d => {
                    const pct = riskTotal > 0 ? ((d.value / riskTotal) * 100).toFixed(1) : '0';
                    return (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span>{d.name}</span>
                        </div>
                        <span className="font-medium">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Currency Exposure */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Currency Exposure
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currencyData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={currencyData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                        {currencyData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 })} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {currencyData.map(d => {
                    const pct = currTotal > 0 ? ((d.value / currTotal) * 100).toFixed(1) : '0';
                    return (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span>{d.name}</span>
                        </div>
                        <span className="font-medium">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
