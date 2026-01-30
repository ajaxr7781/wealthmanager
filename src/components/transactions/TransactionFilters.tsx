import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { TransactionFilter } from '@/pages/Transactions';

interface TransactionFiltersProps {
  filters: TransactionFilter;
  onFiltersChange: (filters: TransactionFilter) => void;
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const hasFilters = filters.instrument !== 'all' || 
                     filters.side !== 'all' || 
                     filters.dateFrom || 
                     filters.dateTo;

  const clearFilters = () => {
    onFiltersChange({
      instrument: 'all',
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
            <Label className="text-xs text-muted-foreground">Metal</Label>
            <Select
              value={filters.instrument || 'all'}
              onValueChange={(value) => onFiltersChange({ 
                ...filters, 
                instrument: value as 'XAU' | 'XAG' | 'all' 
              })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metals</SelectItem>
                <SelectItem value="XAU">Gold (XAU)</SelectItem>
                <SelectItem value="XAG">Silver (XAG)</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
