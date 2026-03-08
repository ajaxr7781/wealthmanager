import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioSummary, formatCurrency } from '@/lib/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AllocationChartProps {
  summary: PortfolioSummary;
}

const CATEGORY_COLORS: Record<string, string> = {
  precious_metals: 'hsl(45, 93%, 47%)',
  equity: 'hsl(217, 91%, 60%)',
  real_estate: 'hsl(142, 71%, 45%)',
  real_assets: 'hsl(152, 69%, 40%)',
  banking: 'hsl(262, 83%, 58%)',
  fixed_income: 'hsl(262, 83%, 58%)',
  fixed_deposit: 'hsl(262, 83%, 58%)',
  government_savings: 'hsl(280, 65%, 50%)',
  digital: 'hsl(25, 95%, 53%)',
  retirement: 'hsl(290, 60%, 55%)',
  insurance: 'hsl(199, 89%, 48%)',
  cash: 'hsl(199, 89%, 48%)',
  crypto: 'hsl(25, 95%, 53%)',
  shares: 'hsl(340, 82%, 52%)',
  mutual_fund: 'hsl(217, 91%, 60%)',
  sip: 'hsl(190, 80%, 50%)',
  other: 'hsl(220, 13%, 69%)',
};

const FALLBACK_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(45, 93%, 47%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(340, 82%, 52%)',
  'hsl(199, 89%, 48%)',
  'hsl(220, 13%, 69%)',
];

export function AllocationChart({ summary }: AllocationChartProps) {
  const breakdown = summary.categoryBreakdown;

  // Fallback to old gold/silver view if no breakdown
  const data = breakdown && breakdown.length > 0
    ? breakdown.map((cat, i) => ({
        name: cat.label,
        value: cat.value_aed,
        color: CATEGORY_COLORS[cat.category_code] || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      }))
    : buildLegacyData(summary);

  const totalValue = data.reduce((sum, d) => sum + d.value, 0);
  const dataWithPercent = data.map(d => ({
    ...d,
    percent: totalValue > 0 ? (d.value / totalValue) * 100 : 0,
  }));

  if (dataWithPercent.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Allocation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No holdings to display
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercent}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {dataWithPercent.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend
                formatter={(value, entry: any) => (
                  <span className="text-foreground">
                    {value} ({entry.payload?.percent?.toFixed(1)}%)
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          {dataWithPercent.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function buildLegacyData(summary: PortfolioSummary) {
  const goldInstrument = summary.instruments.find(i => i.symbol === 'XAU');
  const silverInstrument = summary.instruments.find(i => i.symbol === 'XAG');
  const goldValue = goldInstrument?.current_value_aed ?? goldInstrument?.cost_basis_aed ?? 0;
  const silverValue = silverInstrument?.current_value_aed ?? silverInstrument?.cost_basis_aed ?? 0;

  return [
    { name: 'Gold (XAU)', value: goldValue, color: 'hsl(45, 93%, 47%)' },
    { name: 'Silver (XAG)', value: silverValue, color: 'hsl(220, 13%, 69%)' },
  ].filter(d => d.value > 0);
}
