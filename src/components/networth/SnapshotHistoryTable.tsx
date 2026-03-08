import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import type { PortfolioSnapshot } from '@/hooks/usePortfolioSnapshots';

interface Props {
  snapshots: PortfolioSnapshot[];
  fmtCurrency: (v: number) => string;
}

export function SnapshotHistoryTable({ snapshots, fmtCurrency }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Snapshot History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total Assets</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Invested</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Liabilities</th>
                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Net Worth</th>
              </tr>
            </thead>
            <tbody>
              {[...snapshots].reverse().map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2 px-3">{format(parseISO(s.snapshot_date), 'dd MMM yyyy')}</td>
                  <td className="text-right py-2 px-3">{fmtCurrency(s.total_value)}</td>
                  <td className="text-right py-2 px-3">{fmtCurrency(s.total_invested)}</td>
                  <td className="text-right py-2 px-3 text-destructive">{fmtCurrency(s.total_liabilities)}</td>
                  <td className="text-right py-2 px-3 font-medium">{fmtCurrency(s.net_worth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
