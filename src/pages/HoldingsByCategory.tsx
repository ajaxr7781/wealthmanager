import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAssets, useUserSettings } from '@/hooks/useAssets';
import { useAllAssetTransactions } from '@/hooks/useAssetTransactions';
import { useLatestPrices } from '@/hooks/usePrices';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, ChevronRight, ArrowLeft, Coins, HelpCircle, ArrowUpDown, ArrowUp, ArrowDown, X, SlidersHorizontal, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColorClass } from '@/types/assetConfig';
import { getEffectiveFDValue } from '@/lib/fdCalculations';
import { DEFAULT_INR_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';
import { differenceInDays, parseISO, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import {
  Landmark,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  Briefcase,
  BarChart3,
  PieChart,
  Package,
} from 'lucide-react';

const IconMap: Record<string, typeof Coins> = {
  Coins,
  Landmark,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  Briefcase,
  BarChart3,
  PieChart,
  Package,
};

type SortKey = 'name' | 'value' | 'pl' | 'date' | 'maturity';
type SortDir = 'asc' | 'desc';
type MaturityFilter = 'all' | 'active' | 'matured' | 'upcoming_7' | 'upcoming_30' | 'upcoming_90';

export default function HoldingsByCategory() {
  const { categoryCode } = useParams<{ categoryCode: string }>();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesWithTypes();
  const { data: settings } = useUserSettings();
  const { data: allTransactions } = useAllAssetTransactions();
  const { data: prices } = useLatestPrices();

  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;
  const { formatAed } = useCurrency();
  const isLoading = assetsLoading || categoriesLoading;

  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Filters
  const [search, setSearch] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'AED' | 'INR'>('all');
  const [maturityFilter, setMaturityFilter] = useState<MaturityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [bankFilter, setBankFilter] = useState<string>('all');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getAssetCurrentValue = (a: any): number => {
    if (a.asset_type === 'precious_metals' && a.metal_type) {
      const priceData = a.metal_type === 'XAU' ? prices?.XAU : prices?.XAG;
      if (priceData && a.quantity) {
        const qty = Number(a.quantity);
        const unit = (a.quantity_unit || 'oz').toLowerCase();
        const qtyOz = unit === 'grams' || unit === 'gram' || unit === 'g' ? qty / OUNCE_TO_GRAM : qty;
        return qtyOz * priceData.price_aed_per_oz;
      }
    }
    if (a.asset_type === 'fixed_deposit' || a.asset_type_code === 'fixed_deposit') {
      return getEffectiveFDValue({
        principal: a.principal ? Number(a.principal) : null,
        interest_rate: a.interest_rate ? Number(a.interest_rate) : null,
        purchase_date: a.purchase_date,
        maturity_date: a.maturity_date,
        maturity_amount: a.maturity_amount ? Number(a.maturity_amount) : null,
        current_value: a.current_value ? Number(a.current_value) : null,
        is_current_value_manual: a.is_current_value_manual,
        total_cost: Number(a.total_cost),
      }).currentValue;
    }
    return Number(a.current_value) || Number(a.total_cost) || 0;
  };

  const category = categories?.find(c => c.code === categoryCode);
  const categoryAssets = useMemo(() => assets?.filter(a => a.category_code === categoryCode) || [], [assets, categoryCode]);

  const fmtAed = (value: number) => formatAed(value, { decimals: 0 });

  const convertToAed = (value: number, currency: string) => {
    return currency === 'INR' ? value * inrToAed : value;
  };

  // Filter options derived from category assets
  const bankOptions = useMemo(() => {
    const banks = new Set(categoryAssets.map(a => a.bank_name).filter(Boolean) as string[]);
    return Array.from(banks).sort();
  }, [categoryAssets]);

  const typeOptions = useMemo(() => {
    if (!category) return [];
    return category.asset_types.filter(t => categoryAssets.some(a => a.asset_type_code === t.code));
  }, [category, categoryAssets]);

  const today = startOfDay(new Date());

  // Filter assets
  const filteredAssets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return categoryAssets.filter(a => {
      if (normalizedSearch) {
        const haystack = [
          a.asset_name,
          a.bank_name,
          a.instrument_name,
          a.broker_platform,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      if (currencyFilter !== 'all' && a.currency !== currencyFilter) return false;
      if (typeFilter !== 'all' && a.asset_type_code !== typeFilter) return false;
      if (bankFilter !== 'all' && a.bank_name !== bankFilter) return false;
      if (maturityFilter !== 'all') {
        if (a.maturity_date) {
          const maturityDate = startOfDay(parseISO(a.maturity_date));
          const isMatured = !isAfter(maturityDate, today);
          const daysUntil = differenceInDays(maturityDate, today);
          switch (maturityFilter) {
            case 'active': return !isMatured;
            case 'matured': return isMatured;
            case 'upcoming_7': return !isMatured && daysUntil <= 7;
            case 'upcoming_30': return !isMatured && daysUntil <= 30;
            case 'upcoming_90': return !isMatured && daysUntil <= 90;
          }
        } else {
          return maturityFilter === 'active';
        }
      }
      return true;
    });
  }, [categoryAssets, search, currencyFilter, typeFilter, bankFilter, maturityFilter, today]);

  // Sorted assets for non-PM view
  const sortedAssets = useMemo(() => {
    const list = [...filteredAssets];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.asset_name.localeCompare(b.asset_name); break;
        case 'value': {
          const va = convertToAed(getAssetCurrentValue(a), a.currency);
          const vb = convertToAed(getAssetCurrentValue(b), b.currency);
          cmp = va - vb; break;
        }
        case 'pl': {
          const plA = convertToAed(getAssetCurrentValue(a), a.currency) - convertToAed(Number(a.total_cost), a.currency);
          const plB = convertToAed(getAssetCurrentValue(b), b.currency) - convertToAed(Number(b.total_cost), b.currency);
          const pctA = Number(a.total_cost) > 0 ? plA / convertToAed(Number(a.total_cost), a.currency) : 0;
          const pctB = Number(b.total_cost) > 0 ? plB / convertToAed(Number(b.total_cost), b.currency) : 0;
          cmp = pctA - pctB; break;
        }
        case 'date': cmp = a.purchase_date.localeCompare(b.purchase_date); break;
        case 'maturity': {
          const ma = a.maturity_date || '9999-12-31';
          const mb = b.maturity_date || '9999-12-31';
          cmp = ma.localeCompare(mb); break;
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredAssets, sortKey, sortDir, inrToAed, prices]);

  const hasActiveFilters = search || currencyFilter !== 'all' || maturityFilter !== 'all' || typeFilter !== 'all' || bankFilter !== 'all';
  const clearFilters = () => {
    setSearch('');
    setCurrencyFilter('all');
    setMaturityFilter('all');
    setTypeFilter('all');
    setBankFilter('all');
  };

  // Category-level CAGR
  const categoryCagr = useMemo(() => {
    if (!category || categoryAssets.length === 0) return null;
    
    const catTotalInvested = categoryAssets.reduce((sum, a) => sum + convertToAed(Number(a.total_cost), a.currency), 0);
    const catTotalValue = categoryAssets.reduce((sum, a) => {
      const value = getAssetCurrentValue(a);
      return sum + convertToAed(value, a.currency);
    }, 0);

    if (catTotalInvested <= 0 || catTotalValue <= 0) return null;
    const dates = categoryAssets.map(a => parseISO(a.purchase_date));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const years = differenceInDays(new Date(), earliest) / 365.25;
    if (years <= 0) return null;
    return (Math.pow(catTotalValue / catTotalInvested, 1 / years) - 1) * 100;
  }, [category, categoryAssets, inrToAed]);

  // Detect if this is a precious metals category — group by metal_type
  const isPreciousMetals = categoryCode === 'precious_metals';

  // Group precious metals by metal_type
  const metalGroups = useMemo(() => {
    if (!isPreciousMetals) return [];
    const groups = new Map<string, { label: string; assets: typeof categoryAssets; totalInvested: number; totalValue: number; totalQtyOz: number; buyCount: number }>();
    for (const a of categoryAssets) {
      const key = a.metal_type || 'unknown';
      const label = key === 'XAU' ? 'Gold' : key === 'XAG' ? 'Silver' : key;
      if (!groups.has(key)) {
        groups.set(key, { label, assets: [], totalInvested: 0, totalValue: 0, totalQtyOz: 0, buyCount: 0 });
      }
      const g = groups.get(key)!;
      g.assets.push(a);
      g.totalInvested += convertToAed(Number(a.total_cost), a.currency);
      const val = getAssetCurrentValue(a);
      g.totalValue += convertToAed(val, a.currency);
      if (a.quantity) {
        const qty = Number(a.quantity);
        const unit = (a.quantity_unit || 'oz').toLowerCase();
        g.totalQtyOz += unit === 'grams' || unit === 'gram' || unit === 'g' ? qty / OUNCE_TO_GRAM : qty;
      }
      // Count BUY transactions for this asset
      const assetTxns = allTransactions?.filter(t => t.asset_id === a.id && t.transaction_type === 'BUY') || [];
      g.buyCount += assetTxns.length;
    }
    return Array.from(groups.entries())
      .map(([key, g]) => ({ metalType: key, ...g }))
      .sort((a, b) => b.totalValue - a.totalValue);
  }, [isPreciousMetals, categoryAssets, prices, inrToAed, allTransactions]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!category) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8">
          <p className="text-muted-foreground">Category not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const CategoryIcon = IconMap[category.icon || 'Package'] || Package;

  // Calculate category totals
  const totalInvested = categoryAssets.reduce((sum, a) => {
    const cost = Number(a.total_cost);
    return sum + convertToAed(cost, a.currency);
  }, 0);
  
  const totalValue = categoryAssets.reduce((sum, a) => {
    const value = getAssetCurrentValue(a);
    return sum + convertToAed(value, a.currency);
  }, 0);

  const totalPL = totalValue - totalInvested;
  const plPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/holdings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              getColorClass(category.color)
            )}>
              <CategoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{category.name}</h1>
              <p className="text-muted-foreground">
                {categoryAssets.length} holding{categoryAssets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link to="/assets/new">
            <Button className="gold-gradient text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </Link>
        </div>

        {/* Category Summary */}
        {categoryAssets.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtAed(totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtAed(totalInvested)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total P/L</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "text-2xl font-bold",
                  totalPL >= 0 ? "text-positive" : "text-negative"
                )}>
                  {totalPL >= 0 ? '+' : ''}{fmtAed(totalPL)}
                  <span className="text-sm ml-2">({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(1)}%)</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  CAGR
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Compound Annual Growth Rate for this category</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryCagr !== null ? (
                  <p className={cn("text-2xl font-bold",
                    categoryCagr > 12 ? "text-positive" : categoryCagr > 6 ? "text-warning" : "text-destructive"
                  )}>
                    {categoryCagr >= 0 ? '+' : ''}{categoryCagr.toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-lg text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Asset List */}
        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryAssets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No assets in this category</p>
                <Link to="/assets/new">
                  <Button className="gold-gradient text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                </Link>
              </div>
            ) : isPreciousMetals ? (
              /* Grouped view for precious metals */
              <div className="space-y-3">
                {metalGroups.map((group) => {
                  const pl = group.totalValue - group.totalInvested;
                  const plPct = group.totalInvested > 0 ? (pl / group.totalInvested) * 100 : 0;
                  const isProfit = pl >= 0;

                  return (
                    <Link
                      key={group.metalType}
                      to={`/holdings/precious_metals/${group.metalType}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          getColorClass(category.color)
                        )}>
                          <Coins className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{group.label}</p>
                          <div className="text-sm text-muted-foreground">
                            <span>{fmtAed(group.totalInvested)} invested</span>
                            <span className="ml-2">· {group.totalQtyOz.toFixed(3)} oz</span>
                            <span className="ml-2">· {group.buyCount} purchase{group.buyCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{fmtAed(group.totalValue)}</p>
                          <p className={cn(
                            "text-sm",
                            isProfit ? "text-positive" : "text-negative"
                          )}>
                            {isProfit ? '+' : ''}{plPct.toFixed(1)}%
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
            <div>
              {/* Filter bar */}
              <div className="mb-4 flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, bank..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={currencyFilter} onValueChange={(v) => setCurrencyFilter(v as 'all' | 'AED' | 'INR')}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currencies</SelectItem>
                      <SelectItem value="AED">AED</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={maturityFilter} onValueChange={(v) => setMaturityFilter(v as MaturityFilter)}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Maturity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="matured">Matured</SelectItem>
                      <SelectItem value="upcoming_7">Matures ≤ 7 days</SelectItem>
                      <SelectItem value="upcoming_30">Matures ≤ 30 days</SelectItem>
                      <SelectItem value="upcoming_90">Matures ≤ 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                  {typeOptions.length > 1 && (
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {typeOptions.map(t => (
                          <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {bankOptions.length > 0 && (
                    <Select value={bankFilter} onValueChange={setBankFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="Bank" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Banks</SelectItem>
                        {bankOptions.map(b => (
                          <SelectItem key={b} value={b}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="self-start">
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Showing {filteredAssets.length} of {categoryAssets.length} holding{categoryAssets.length !== 1 ? 's' : ''}
                </p>
              </div>

              {sortedAssets.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">No holdings match your filters.</p>
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div>
                {/* Sort headers */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_28px] gap-2 px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground rounded-t-lg">
                  <button onClick={() => toggleSort('name')} className="flex items-center hover:text-foreground transition-colors text-left">
                    Asset <SortIcon col="name" />
                  </button>
                  <button onClick={() => toggleSort('date')} className="flex items-center hover:text-foreground transition-colors text-left">
                    Purchase Date <SortIcon col="date" />
                  </button>
                  <button onClick={() => toggleSort('maturity')} className="flex items-center hover:text-foreground transition-colors text-left">
                    Maturity Date <SortIcon col="maturity" />
                  </button>
                  <button onClick={() => toggleSort('value')} className="flex items-center justify-end hover:text-foreground transition-colors">
                    Value <SortIcon col="value" />
                  </button>
                  <button onClick={() => toggleSort('pl')} className="flex items-center justify-end hover:text-foreground transition-colors">
                    Return <SortIcon col="pl" />
                  </button>
                  <span />
                </div>
                <div className="divide-y">
                {sortedAssets.map((asset) => {
                  const currentValue = getAssetCurrentValue(asset);
                  const isINR = asset.currency === 'INR';
                  
                  const currentValueAed = convertToAed(currentValue, asset.currency);
                  const totalCostAed = convertToAed(Number(asset.total_cost), asset.currency);
                  const pl = currentValueAed - totalCostAed;
                  const plPct = totalCostAed > 0 ? (pl / totalCostAed) * 100 : 0;
                  const isProfit = pl >= 0;

                  const assetType = category.asset_types.find(t => t.code === asset.asset_type_code);
                  const TypeIcon = assetType?.icon ? IconMap[assetType.icon] || Package : Package;

                  return (
                    <Link
                      key={asset.id}
                      to={`/asset/${asset.id}`}
                      className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_28px] gap-1 sm:gap-2 items-center px-4 py-3 hover:bg-muted/40 transition-colors group"
                    >
                      {/* Name + icon */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center",
                          getColorClass(category.color)
                        )}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{asset.asset_name}</p>
                            {assetType && (
                              <Badge variant="secondary" className="text-[10px] hidden lg:inline-flex">
                                {assetType.name}
                              </Badge>
                            )}
                            {isINR && (
                              <Badge variant="outline" className="text-[10px]">INR</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {fmtAed(totalCostAed)} invested
                            {asset.quantity && asset.quantity_unit && (
                              <span className="ml-1">· {Number(asset.quantity).toLocaleString()} {asset.quantity_unit}</span>
                            )}
                          </p>
                          {/* Mobile date */}
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {format(parseISO(asset.purchase_date), 'dd MMM yyyy')}
                            {asset.maturity_date && (
                              <span> · Mat: {format(parseISO(asset.maturity_date), 'dd MMM yyyy')}</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Purchase Date (desktop) */}
                      <div className="hidden sm:block">
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(asset.purchase_date), 'dd MMM yyyy')}
                        </p>
                      </div>

                      {/* Maturity Date (desktop) */}
                      <div className="hidden sm:block">
                        {asset.maturity_date ? (
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(asset.maturity_date), 'dd MMM yyyy')}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">—</p>
                        )}
                      </div>

                      {/* Value */}
                      <div className="hidden sm:block text-right">
                        <p className="text-sm font-medium">{fmtAed(currentValueAed)}</p>
                        <p className="text-[11px] text-muted-foreground">{fmtAed(totalCostAed)} cost</p>
                      </div>

                      {/* Return */}
                      <div className="hidden sm:block text-right">
                        <p className={cn("text-sm font-medium", isProfit ? "text-positive" : "text-negative")}>
                          {isProfit ? '+' : ''}{plPct.toFixed(1)}%
                        </p>
                        <p className={cn("text-[11px]", isProfit ? "text-positive/70" : "text-negative/70")}>
                          {isProfit ? '+' : ''}{fmtAed(pl)}
                        </p>
                      </div>

                      {/* Mobile value + return */}
                      <div className="flex items-center justify-between sm:hidden">
                        <span className="text-sm font-medium">{fmtAed(currentValueAed)}</span>
                        <span className={cn("text-sm", isProfit ? "text-positive" : "text-negative")}>
                          {isProfit ? '+' : ''}{plPct.toFixed(1)}%
                        </span>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="hidden sm:block h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors justify-self-end" />
                    </Link>
                  );
                })}
                </div>
              </div>
            )}
          </div>
        )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
