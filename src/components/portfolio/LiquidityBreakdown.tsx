import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Droplets, ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Asset, AssetType } from '@/types/assets';
import { DEFAULT_INR_TO_AED, ASSET_TYPE_LABELS } from '@/types/assets';
import { useUserSettings } from '@/hooks/useAssets';
import { useAssetCategories } from '@/hooks/useAssetConfig';
import {
  calculateLiquidityBreakdown,
  getLiquidityInsights,
  calculateEmergencyCoverage,
  LIQUIDITY_TIERS,
  type LiquidityTier,
  type LiquidityBreakdownResult,
} from '@/lib/liquidity';

interface LiquidityBreakdownProps {
  assets: Asset[];
  monthlyExpenses?: number;
  getValueAed?: (asset: Asset) => number;
  compact?: boolean;
}

const TIER_ICONS = {
  liquid: CheckCircle2,
  semi_liquid: Info,
  illiquid: AlertTriangle,
};

const EMERGENCY_STATUS_STYLES = {
  critical: { label: 'Critical', badgeVariant: 'destructive' as const, color: 'text-negative' },
  low: { label: 'Low', badgeVariant: 'warning' as const, color: 'text-warning' },
  adequate: { label: 'Adequate', badgeVariant: 'success' as const, color: 'text-positive' },
  strong: { label: 'Strong', badgeVariant: 'success' as const, color: 'text-positive' },
};

export function LiquidityBreakdown({ assets, monthlyExpenses = 0, getValueAed, compact = false }: LiquidityBreakdownProps) {
  const { formatAed } = useCurrency();
  const { data: settings } = useUserSettings();
  const { data: categories } = useAssetCategories();
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;
  const [selectedTier, setSelectedTier] = useState<LiquidityTier | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  const breakdown = calculateLiquidityBreakdown(assets, getValueAed, inrToAed);
  const insights = getLiquidityInsights(breakdown);
  const emergency = calculateEmergencyCoverage(breakdown.liquid, monthlyExpenses);

  const chartData = breakdown.byTier.filter(d => d.value > 0);

  const fmt = (v: number) => formatAed(v, { decimals: 0 });

  if (breakdown.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="h-5 w-5 text-primary" /> Liquidity Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8 text-sm">No assets to analyze</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Droplets className="h-5 w-5 text-primary" /> Liquidity Structure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Donut Chart */}
        <div className={cn("mx-auto", compact ? "h-40 w-40" : "h-52 w-full max-w-[280px]")}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={compact ? 35 : 50}
                outerRadius={compact ? 60 : 80}
                paddingAngle={2}
                dataKey="value"
                onClick={(_, index) => {
                  const tier = chartData[index]?.tier;
                  setSelectedTier(prev => prev === tier ? null : tier);
                }}
                className="cursor-pointer"
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    opacity={selectedTier && selectedTier !== entry.tier ? 0.35 : 1}
                    stroke={selectedTier === entry.tier ? 'hsl(var(--foreground))' : 'transparent'}
                    strokeWidth={selectedTier === entry.tier ? 2 : 0}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tier Breakdown Bars */}
        <div className="space-y-3">
          {breakdown.byTier.map(tier => {
            const TierIcon = TIER_ICONS[tier.tier];
            const isSelected = selectedTier === tier.tier;
            return (
              <button
                key={tier.tier}
                onClick={() => setSelectedTier(prev => prev === tier.tier ? null : tier.tier)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-all",
                  isSelected
                    ? "border-primary/50 bg-accent/50 ring-1 ring-primary/20"
                    : "border-border hover:border-primary/30 hover:bg-accent/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                    <TierIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{tier.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">{fmt(tier.value)}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">({tier.percent.toFixed(4)}%)</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${tier.percent}%`, backgroundColor: tier.color }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Tier Drill-down */}
        {selectedTier && (() => {
          const tierAssets = breakdown.byTier.find(t => t.tier === selectedTier)?.assets ?? [];
          
          // Build category label lookup
          const catLabels: Record<string, string> = {};
          for (const c of categories || []) {
            catLabels[c.code] = c.name;
          }
          
          // Group by category_code, then list individual assets under each
          const typeGroups: Record<string, { label: string; totalValue: number; items: { key: string; label: string; value: number }[] }> = {};
          
          for (const asset of tierAssets) {
            const val = getValueAed
              ? getValueAed(asset)
              : (() => {
                  const raw = Number(asset.current_value) || Number(asset.total_cost) || 0;
                  return asset.currency === 'INR' ? raw * inrToAed : raw;
                })();
            
            const groupKey = asset.category_code || asset.asset_type_code || asset.asset_type;
            if (!typeGroups[groupKey]) {
              typeGroups[groupKey] = {
                label: catLabels[groupKey] || ASSET_TYPE_LABELS[groupKey as AssetType] || groupKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                totalValue: 0,
                items: [],
              };
            }
            typeGroups[groupKey].totalValue += val;
            
            // For precious metals, use metal name instead of asset_name
            const displayName = asset.asset_type === 'precious_metals' && asset.metal_type
              ? (asset.metal_type === 'XAU' ? 'Gold' : asset.metal_type === 'XAG' ? 'Silver' : asset.asset_name)
              : asset.asset_name;
            
            // Merge precious metals of same type
            const existingItem = asset.asset_type === 'precious_metals'
              ? typeGroups[groupKey].items.find(i => i.key === `metal-${asset.metal_type}`)
              : null;
            if (existingItem) {
              existingItem.value += val;
            } else {
              typeGroups[groupKey].items.push({
                key: asset.asset_type === 'precious_metals' ? `metal-${asset.metal_type}` : asset.id,
                label: displayName,
                value: val,
              });
            }
          }
          
          const sortedGroups = Object.entries(typeGroups)
            .sort(([, a], [, b]) => b.totalValue - a.totalValue);
          
          const totalAssetCount = sortedGroups.reduce((sum, [, g]) => sum + g.items.length, 0);
          
          return (
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">
                  {LIQUIDITY_TIERS[selectedTier].label} Assets
                </h4>
                <Badge variant="outline" className="text-xs">
                  {totalAssetCount} assets
                </Badge>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {sortedGroups.map(([typeKey, group]) => (
                  <Collapsible key={typeKey} defaultOpen={sortedGroups.length <= 3}>
                    <CollapsibleTrigger className="w-full flex items-center justify-between text-sm py-1.5 px-1 hover:bg-accent/50 rounded transition-colors">
                      <span className="font-medium text-foreground">{group.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-xs">{group.items.length}</span>
                        <span className="font-medium text-foreground">{fmt(group.totalValue)}</span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-3 border-l-2 border-border/50 ml-1 space-y-0.5">
                        {group.items.sort((a, b) => b.value - a.value).map(item => (
                          <div key={item.key} className="flex items-center justify-between text-xs py-1 px-1">
                            <span className="text-muted-foreground truncate mr-2">{item.label}</span>
                            <span className="text-muted-foreground whitespace-nowrap">{fmt(item.value)}</span>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Emergency Coverage */}
        {monthlyExpenses > 0 && (
          <div className="border rounded-lg p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Emergency Coverage</span>
              </div>
              <Badge variant={EMERGENCY_STATUS_STYLES[emergency.status].badgeVariant}>
                {EMERGENCY_STATUS_STYLES[emergency.status].label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Your liquid assets cover approximately{' '}
              <span className={cn("font-semibold", EMERGENCY_STATUS_STYLES[emergency.status].color)}>
                {emergency.months >= 99 ? '∞' : `${emergency.months.toFixed(1)}`} months
              </span>
              {' '}of expenses based on your monthly EMI obligations.
            </p>
          </div>
        )}

        {/* Insights Toggle */}
        {insights.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInsights(!showInsights)}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              {showInsights ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {showInsights ? 'Hide' : 'Show'} Portfolio Insights ({insights.length})
            </Button>
            {showInsights && (
              <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {insights.map((insight, i) => {
                  const InsightIcon = insight.type === 'warning' ? AlertTriangle : insight.type === 'success' ? CheckCircle2 : Info;
                  const borderColor = insight.type === 'warning' ? 'border-warning/40' : insight.type === 'success' ? 'border-positive/40' : 'border-primary/40';
                  const bgColor = insight.type === 'warning' ? 'bg-warning/5' : insight.type === 'success' ? 'bg-positive/5' : 'bg-primary/5';
                  const iconColor = insight.type === 'warning' ? 'text-warning' : insight.type === 'success' ? 'text-positive' : 'text-primary';
                  return (
                    <div key={i} className={cn("border rounded-lg p-3", borderColor, bgColor)}>
                      <div className="flex gap-2">
                        <InsightIcon className={cn("h-4 w-4 shrink-0 mt-0.5", iconColor)} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{insight.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Small inline badge showing asset liquidity tier
 */
export function LiquidityBadge({ asset }: { asset: Asset }) {
  const tier = LIQUIDITY_TIERS[
    (() => {
      const cat = asset.category_code || asset.asset_type_code || asset.asset_type;
      if (['cash', 'savings', 'current_account', 'wallet', 'shares', 'stocks', 'etf', 'equity', 'listed_equity', 'digital'].includes(cat)) return 'liquid';
      if (['real_estate', 'real_assets', 'land', 'private_equity', 'locked_investment'].includes(cat)) return 'illiquid';
      return 'semi_liquid';
    })() as LiquidityTier
  ];

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
      style={{
        backgroundColor: `${tier.color}15`,
        color: tier.color,
      }}
    >
      {tier.label}
    </span>
  );
}
