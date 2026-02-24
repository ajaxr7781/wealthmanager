import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Asset } from '@/types/assets';
import { ASSET_TYPE_LABELS, DEFAULT_INR_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';
import { useUserSettings } from '@/hooks/useAssets';
import { useLatestPrices } from '@/hooks/usePrices';
import { getEffectiveFDValue } from '@/lib/fdCalculations';
import {
  Coins,
  Building2,
  Landmark,
  TrendingUp,
  PieChart,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Plus,
  CalendarClock,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetListProps {
  assets: Asset[];
}

const ASSET_ICONS: Record<string, typeof Coins> = {
  precious_metals: Coins,
  real_estate: Building2,
  fixed_deposit: Landmark,
  sip: TrendingUp,
  mutual_fund: PieChart,
  shares: BarChart3,
};

const ASSET_COLORS: Record<string, string> = {
  precious_metals: 'bg-gold/20 text-gold',
  real_estate: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  fixed_deposit: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  sip: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  mutual_fund: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
  shares: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
};

const PAGE_SIZE_OPTIONS = [5, 10, 20];

type SortKey = 'name' | 'value' | 'pl' | 'type';
type SortDir = 'asc' | 'desc';

export function AssetList({ assets }: AssetListProps) {
  const { data: settings } = useUserSettings();
  const { data: prices } = useLatestPrices();
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>('value');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const formatAED = (v: number) =>
    new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const formatINR = (v: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

  const getLivePreciousMetalValueAED = (a: Asset): number | null => {
    if (a.asset_type !== 'precious_metals' || !a.metal_type || !a.quantity) return null;

    const priceData = a.metal_type === 'XAU' ? prices?.XAU : prices?.XAG;
    if (!priceData) return null;

    const qty = Number(a.quantity);
    const unit = (a.quantity_unit || 'oz').toLowerCase();
    const qtyOz = unit === 'grams' || unit === 'gram' || unit === 'g' ? qty / OUNCE_TO_GRAM : qty;
    return qtyOz * priceData.price_aed_per_oz;
  };

  const getAssetCurrentValue = (a: Asset) => {
    const pmLiveAed = getLivePreciousMetalValueAED(a);
    if (pmLiveAed !== null) return pmLiveAed;

    if (a.asset_type === 'fixed_deposit' || a.asset_type_code === 'fixed_deposit') {
      const fdResult = getEffectiveFDValue({
        principal: a.principal ? Number(a.principal) : null,
        interest_rate: a.interest_rate ? Number(a.interest_rate) : null,
        purchase_date: a.purchase_date,
        maturity_date: a.maturity_date,
        maturity_amount: a.maturity_amount ? Number(a.maturity_amount) : null,
        current_value: a.current_value ? Number(a.current_value) : null,
        is_current_value_manual: a.is_current_value_manual,
        total_cost: Number(a.total_cost),
      });
      return fdResult.currentValue;
    }

    return Number(a.current_value) || Number(a.total_cost) || 0;
  };

  const getValueAED = (a: Asset) => {
    const pmLiveAed = getLivePreciousMetalValueAED(a);
    if (pmLiveAed !== null) return pmLiveAed;

    const v = getAssetCurrentValue(a);
    return a.currency === 'INR' ? v * inrToAed : v;
  };
  const getCostAED = (a: Asset) => {
    const c = Number(a.total_cost);
    return a.currency === 'INR' ? c * inrToAed : c;
  };
  const getPL = (a: Asset) => {
    const val = getValueAED(a);
    const cost = getCostAED(a);
    const pl = val - cost;
    return { pl, pct: cost > 0 ? (pl / cost) * 100 : 0 };
  };

  // Derive MF and SIP summaries from the unified assets array
  const mfAssets = useMemo(() => assets.filter(a => a.asset_type === 'mutual_fund'), [assets]);
  const sipAssets = useMemo(() => assets.filter(a => a.asset_type === 'sip' && a.sip_status === 'ACTIVE'), [assets]);

  const mfTotalInvested = mfAssets.reduce((s, a) => s + Number(a.total_cost), 0);
  const mfCurrentValue = mfAssets.reduce((s, a) => s + (Number(a.current_value) || Number(a.total_cost)), 0);
  const mfPL = mfCurrentValue - mfTotalInvested;
  const mfPLPct = mfTotalInvested > 0 ? (mfPL / mfTotalInvested) * 100 : 0;

  const sipMonthly = sipAssets.reduce((s, a) => s + (Number(a.sip_amount) || 0), 0);
  const sipValue = sipAssets.reduce((s, a) => {
    const v = Number(a.current_value) || Number(a.total_cost) || 0;
    return s + v;
  }, 0);

  // Unique asset types for filter
  const assetTypes = useMemo(() => {
    const types = new Set(assets.map(a => a.asset_type));
    return Array.from(types);
  }, [assets]);

  // Filtered + sorted assets
  const processed = useMemo(() => {
    let list = [...assets];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.asset_name.toLowerCase().includes(q) || ASSET_TYPE_LABELS[a.asset_type]?.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') {
      list = list.filter(a => a.asset_type === typeFilter);
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.asset_name.localeCompare(b.asset_name); break;
        case 'value': cmp = getValueAED(a) - getValueAED(b); break;
        case 'pl': cmp = getPL(a).pct - getPL(b).pct; break;
        case 'type': cmp = a.asset_type.localeCompare(b.asset_type); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [assets, search, typeFilter, sortKey, sortDir, inrToAed]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = processed.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' || key === 'type' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (assets.length === 0) {
    return (
      <Card className="shadow-pro">
        <CardHeader>
          <CardTitle>Your Assets</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">No assets added yet</p>
          <Link to="/assets/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Asset
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-pro">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Your Assets</CardTitle>
          <Link to="/assets/new">
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </Link>
        </div>

        {/* Search & Filter bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center pt-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {assetTypes.map(t => (
                <SelectItem key={t} value={t}>{ASSET_TYPE_LABELS[t] || t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="px-0 pb-0">
        {/* Summary rows — MF & SIPs derived from unified assets */}
        {(mfAssets.length > 0 || sipAssets.length > 0) && (
          <div className="px-6 pb-4 space-y-2">
            {mfAssets.length > 0 && (
              <Link to="/mf/holdings" className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", ASSET_COLORS['mutual_fund'])}>
                    <PieChart className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Mutual Funds</span>
                      <Badge variant="secondary" className="text-[10px]">{mfAssets.length}</Badge>
                      <Badge variant="outline" className="text-[10px]">INR</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatINR(mfTotalInvested)} invested</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatINR(mfCurrentValue)}</p>
                    <p className={cn("text-xs", mfPL >= 0 ? "text-positive" : "text-negative")}>
                      {mfPL >= 0 ? '+' : ''}{mfPLPct.toFixed(1)}%
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
              </Link>
            )}
            {sipAssets.length > 0 && (
              <Link to="/mf/sips" className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", ASSET_COLORS['sip'])}>
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Active SIPs</span>
                      <Badge variant="secondary" className="text-[10px]">{sipAssets.length}</Badge>
                      <Badge variant="outline" className="text-[10px]">INR</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatINR(sipMonthly)}/mo</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatINR(sipValue)}</p>
                    <p className="text-xs text-muted-foreground">≈ {formatAED(sipValue * inrToAed)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_28px] gap-2 px-6 py-2 border-t border-b bg-muted/30 text-xs font-medium text-muted-foreground">
          <button onClick={() => toggleSort('name')} className="flex items-center hover:text-foreground transition-colors text-left">
            Asset <SortIcon col="name" />
          </button>
          <button onClick={() => toggleSort('type')} className="flex items-center hover:text-foreground transition-colors text-left">
            Type <SortIcon col="type" />
          </button>
          <button onClick={() => toggleSort('value')} className="flex items-center justify-end hover:text-foreground transition-colors">
            Value <SortIcon col="value" />
          </button>
          <button onClick={() => toggleSort('pl')} className="flex items-center justify-end hover:text-foreground transition-colors">
            Return <SortIcon col="pl" />
          </button>
          <span />
        </div>

        {/* Asset rows */}
        <div className="divide-y">
          {paged.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No assets match your search
            </div>
          )}
          {paged.map(asset => {
            const Icon = ASSET_ICONS[asset.asset_type] || Coins;
            const { pl, pct } = getPL(asset);
            const isProfit = pl >= 0;
            const valueAED = getValueAED(asset);

            return (
              <Link
                key={asset.id}
                to={`/asset/${asset.id}`}
                className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_28px] gap-1 sm:gap-2 items-center px-6 py-3 hover:bg-muted/40 transition-colors group"
              >
                {/* Name + icon */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center", ASSET_COLORS[asset.asset_type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{asset.asset_name}</p>
                    <p className="text-xs text-muted-foreground sm:hidden">{ASSET_TYPE_LABELS[asset.asset_type]}</p>
                  </div>
                </div>

                {/* Type (desktop) */}
                <div className="hidden sm:block">
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {ASSET_TYPE_LABELS[asset.asset_type]}
                  </Badge>
                  {asset.currency === 'INR' && (
                    <Badge variant="outline" className="text-[10px] ml-1">INR</Badge>
                  )}
                </div>

                {/* Value */}
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">{formatAED(valueAED)}</p>
                  <p className="text-[11px] text-muted-foreground">{formatAED(getCostAED(asset))} cost</p>
                </div>

                {/* Return */}
                <div className="hidden sm:block text-right">
                  <p className={cn("text-sm font-medium", isProfit ? "text-positive" : "text-negative")}>
                    {isProfit ? '+' : ''}{pct.toFixed(1)}%
                  </p>
                  <p className={cn("text-[11px]", isProfit ? "text-positive/70" : "text-negative/70")}>
                    {isProfit ? '+' : ''}{formatAED(pl)}
                  </p>
                </div>

                {/* Mobile value + return */}
                <div className="flex items-center justify-between sm:hidden">
                  <span className="text-sm font-medium">{formatAED(valueAED)}</span>
                  <span className={cn("text-sm", isProfit ? "text-positive" : "text-negative")}>
                    {isProfit ? '+' : ''}{pct.toFixed(1)}%
                  </span>
                </div>

                {/* Arrow */}
                <ChevronRight className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors justify-self-end" />
              </Link>
            );
          })}
        </div>

        {/* Pagination footer */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-6 py-3 border-t bg-muted/20 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{processed.length} asset{processed.length !== 1 ? 's' : ''}</span>
            <span className="text-border">|</span>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map(n => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">per page</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-2 text-xs text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
