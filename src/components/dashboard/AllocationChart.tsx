import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PortfolioSummary, formatCurrency } from '@/lib/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface AllocationChartProps {
  summary: PortfolioSummary;
}

export function AllocationChart({ summary }: AllocationChartProps) {
  const goldInstrument = summary.instruments.find(i => i.symbol === 'XAU');
  const silverInstrument = summary.instruments.find(i => i.symbol === 'XAG');

  const goldValue = goldInstrument?.current_value_aed ?? goldInstrument?.cost_basis_aed ?? 0;
  const silverValue = silverInstrument?.current_value_aed ?? silverInstrument?.cost_basis_aed ?? 0;
  const totalValue = goldValue + silverValue;

  // Using primary blue for Gold and muted for Silver in the new SaaS theme
  const data = [
    { 
      name: 'Gold (XAU)', 
      value: goldValue, 
      color: 'hsl(217, 91%, 60%)', // Slate blue (primary)
      percent: totalValue > 0 ? (goldValue / totalValue * 100) : 0,
    },
    { 
      name: 'Silver (XAG)', 
      value: silverValue, 
      color: 'hsl(220, 13%, 69%)', // Muted gray
      percent: totalValue > 0 ? (silverValue / totalValue * 100) : 0,
    },
  ].filter(d => d.value > 0);

  if (data.length === 0) {
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
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
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
                labelStyle={{
                  color: 'hsl(var(--foreground))',
                }}
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

        {/* Legend details */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
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