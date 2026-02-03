import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';

export interface TransactionFilter {
  assetType?: string;
  assetName?: string;
  side?: 'BUY' | 'SELL' | 'all';
  dateFrom?: string;
  dateTo?: string;
}

interface TransactionFiltersProps {
  filters: TransactionFilter;
  onFiltersChange: (filters: TransactionFilter) => void;
  availableAssetNames?: string[];
}

export function TransactionFilters({ filters, onFiltersChange, availableAssetNames = [] }: TransactionFiltersProps) {
  const { data: categories } = useCategoriesWithTypes();
  
  // Get all transaction-supporting asset types
  const transactionTypes = categories?.flatMap(cat => 
    cat.asset_types.filter(t => t.supports_transactions && t.is_active)
  ) || [];

  const hasFilters = filters.assetType !== 'all' || 
                     filters.assetName !== 'all' ||
                     filters.side !== 'all' || 
                     filters.dateFrom || 
                     filters.dateTo;

  const clearFilters = () => {
    onFiltersChange({
      assetType: 'all',
      assetName: 'all',
      side: 'all',
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">Asset Type</Label>
            <Select
              value={filters.assetType || 'all'}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                assetType: value,
                assetName: 'all', // Reset asset name when type changes
              })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {transactionTypes.map(type => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.name}
                  </SelectItem>
                ))}
                {/* Legacy support for precious metals */}
                <SelectItem value="XAU">Gold (XAU)</SelectItem>
                <SelectItem value="XAG">Silver (XAG)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {availableAssetNames.length > 0 && (
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Asset Name</Label>
              <Select
                value={filters.assetName || 'all'}
                onValueChange={(value) => onFiltersChange({ 
                  ...filters, 
                  assetName: value 
                })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assets</SelectItem>
                  {availableAssetNames.map(name => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex-1 min-w-[120px]">
            <Label className="text-xs text-muted-foreground">Side</Label>
            <Select
              value={filters.side || 'all'}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                side: value as 'BUY' | 'SELL' | 'all' 
              })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="BUY">Buy</SelectItem>
                <SelectItem value="SELL">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">From Date</Label>
            <Input
              type="date"
              className="mt-1"
              value={filters.dateFrom || ''}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                dateFrom: e.target.value || undefined 
              })}
            />
          </div>

          <div className="flex-1 min-w-[140px]">
            <Label className="text-xs text-muted-foreground">To Date</Label>
            <Input
              type="date"
              className="mt-1"
              value={filters.dateTo || ''}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                dateTo: e.target.value || undefined 
              })}
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
