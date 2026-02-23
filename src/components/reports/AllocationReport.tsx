import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import type { PortfolioOverview, Asset } from '@/types/assets';

interface AllocationReportProps {
  overview: PortfolioOverview;
  assets: Asset[];
}

const COLORS = [
  'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(43, 74%, 49%)',
  'hsl(280, 65%, 60%)', 'hsl(350, 89%, 60%)', 'hsl(25, 95%, 53%)',
  'hsl(190, 80%, 45%)', 'hsl(330, 70%, 55%)',
];

function formatAED(v: number) {
  return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function AllocationPieCard({ title, data, total }: { title: string; data: { name: string; value: number; color: string }[]; total: number }) {
  const filtered = data.filter(d => d.value > 0);
  const warnings = filtered.filter(d => total > 0 && (d.value / total) * 100 > 40);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {warnings.length > 0 && (
          <Alert className="mb-4 border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              <strong>Concentration Warning:</strong> {warnings.map(w => w.name).join(', ')} exceed{warnings.length === 1 ? 's' : ''} 40% of portfolio
            </AlertDescription>
          </Alert>
        )}
        {filtered.length > 0 ? (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={filtered} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                    {filtered.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatAED(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-3">
              {filtered.map(d => {
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0';
                return (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-foreground">{d.name}</span>
                    </div>
                    <span className="font-medium">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-8 text-sm">No data</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AllocationReport({ overview, assets }: AllocationReportProps) {
  const total = overview.total_current_value;

  // By Type (from overview)
  const byType = overview.assets_by_type.map((a, i) => ({
    name: a.label,
    value: a.current_value,
    color: a.color || COLORS[i % COLORS.length],
  }));
  // MF/SIP are now included in assets_by_type — no separate push needed

  // By Currency
  const byCurrency = overview.currency_breakdown.map((c) => ({
    name: c.currency,
    value: c.current_value,
    color: c.currency === 'AED' ? 'hsl(217, 91%, 60%)' : 'hsl(25, 95%, 53%)',
  }));

  // By Geography (heuristic: INR = India, AED = UAE)
  let indiaValue = 0, uaeValue = 0;
  for (const a of assets) {
    const val = Number(a.current_value) || Number(a.total_cost) || 0;
    if (a.currency === 'INR') indiaValue += val;
    else uaeValue += val;
  }
  // MF/SIP INR values are now included in assets — no separate addition needed
  
  const byGeo = [
    { name: 'UAE', value: uaeValue, color: 'hsl(217, 91%, 60%)' },
    { name: 'India', value: indiaValue, color: 'hsl(25, 95%, 53%)' },
  ];
  const geoTotal = uaeValue + indiaValue;

  // Category allocation table
  const allCategories = [...byType].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Pie Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AllocationPieCard title="By Asset Type" data={byType} total={total} />
        <AllocationPieCard title="By Category" data={byType} total={total} />
        <AllocationPieCard title="By Currency" data={byCurrency} total={byCurrency.reduce((s, d) => s + d.value, 0)} />
        <AllocationPieCard title="By Geography" data={byGeo} total={geoTotal} />
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Category</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Invested</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Current Value</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">P/L</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">% of Portfolio</th>
                  <th className="text-center py-2 px-3 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {overview.assets_by_type.map(cat => {
                  const pct = total > 0 ? (cat.current_value / total) * 100 : 0;
                  const plPct = cat.total_invested > 0 ? ((cat.profit_loss / cat.total_invested) * 100) : 0;
                  const isProfit = cat.profit_loss >= 0;
                  const isConcentrated = pct > 40;
                  return (
                    <tr key={cat.type} className="border-b border-border hover:bg-accent/50">
                      <td className="py-2 px-3 font-medium">{cat.label}</td>
                      <td className="text-right py-2 px-3">{formatAED(cat.total_invested)}</td>
                      <td className="text-right py-2 px-3">{formatAED(cat.current_value)}</td>
                      <td className={cn("text-right py-2 px-3", isProfit ? "text-positive" : "text-negative")}>
                        <span className="inline-flex items-center gap-0.5">
                          {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isProfit ? '+' : ''}{plPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-2 px-3">{pct.toFixed(1)}%</td>
                      <td className="text-center py-2 px-3">
                        {isConcentrated && (
                          <Badge variant="outline" className="text-warning border-warning/50">
                            <AlertTriangle className="h-3 w-3 mr-1" /> High
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
