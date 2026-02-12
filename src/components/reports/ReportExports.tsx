import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import type { Asset } from '@/types/assets';
import { ASSET_TYPE_LABELS } from '@/types/assets';
import type { PortfolioOverview } from '@/types/assets';
import type { RawTransaction } from '@/lib/calculations';

interface ReportExportsProps {
  assets: Asset[] | undefined;
  transactions: RawTransaction[] | undefined;
  overview: PortfolioOverview | null | undefined;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(val: string | number | null | undefined): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function ReportExports({ assets, transactions, overview }: ReportExportsProps) {
  const exportTransactionsCSV = () => {
    if (!transactions?.length) return;
    const headers = ['Date', 'Metal', 'Side', 'Quantity', 'Unit', 'Price', 'Price Unit', 'Fees', 'Notes'];
    const rows = transactions.map(tx => [
      tx.trade_date, tx.instrument_symbol, tx.side, tx.quantity,
      tx.quantity_unit, tx.price, tx.price_unit, tx.fees, tx.notes || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
    downloadCSV(csv, `transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportAssetsCSV = () => {
    if (!assets?.length) return;
    const headers = ['Name', 'Type', 'Currency', 'Purchase Date', 'Total Cost', 'Current Value', 'P/L', 'Notes'];
    const rows = assets.map(asset => [
      asset.asset_name,
      ASSET_TYPE_LABELS[asset.asset_type] || asset.asset_type,
      asset.currency,
      asset.purchase_date,
      asset.total_cost,
      asset.current_value || asset.total_cost,
      (asset.current_value || asset.total_cost) - asset.total_cost,
      asset.notes || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(escapeCSV).join(','))].join('\n');
    downloadCSV(csv, `all-assets-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportPortfolioSummaryCSV = () => {
    if (!overview) return;
    const lines = [
      'Portfolio Summary Report',
      `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
      '',
      'Metric,Value (AED)',
      `Total Invested,${overview.total_invested.toFixed(2)}`,
      `Current Value,${overview.total_current_value.toFixed(2)}`,
      `Total P/L,${overview.total_profit_loss.toFixed(2)}`,
      `Total P/L %,${overview.total_profit_loss_percent.toFixed(2)}%`,
      '',
      'Category Breakdown',
      'Category,Invested,Current Value,P/L,Count',
      ...overview.assets_by_type.map(a =>
        `${escapeCSV(a.label)},${a.total_invested.toFixed(2)},${a.current_value.toFixed(2)},${a.profit_loss.toFixed(2)},${a.count}`
      ),
    ];
    downloadCSV(lines.join('\n'), `portfolio-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Transactions
          </CardTitle>
          <CardDescription>Export precious metals trade history</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportTransactionsCSV} disabled={!transactions?.length} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {transactions?.length || 0} transactions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            All Assets
          </CardTitle>
          <CardDescription>Export complete asset data</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportAssetsCSV} disabled={!assets?.length} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {assets?.length || 0} assets
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Portfolio Summary
          </CardTitle>
          <CardDescription>Export summary with allocation breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={exportPortfolioSummaryCSV} disabled={!overview} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
