import { AppLayout } from '@/components/layout/AppLayout';
import { useDefaultPortfolio } from '@/hooks/usePortfolios';
import { useTransactions } from '@/hooks/useTransactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

export default function Reports() {
  const { data: portfolio } = useDefaultPortfolio();
  const { data: transactions } = useTransactions(portfolio?.id);

  const exportCSV = () => {
    if (!transactions?.length) return;
    const headers = ['Date', 'Metal', 'Side', 'Quantity', 'Unit', 'Price', 'Price Unit', 'Fees', 'Notes'];
    const rows = transactions.map(tx => [tx.trade_date, tx.instrument_symbol, tx.side, tx.quantity, tx.quantity_unit, tx.price, tx.price_unit, tx.fees, tx.notes || '']);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Export and analyze your data</p></div>
        <Card className="shadow-luxury">
          <CardHeader><CardTitle>Export Data</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={exportCSV} disabled={!transactions?.length}><Download className="mr-2 h-4 w-4" />Export Transactions CSV</Button>
            <p className="text-sm text-muted-foreground">{transactions?.length || 0} transactions available for export</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
