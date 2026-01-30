import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, Coins, Circle } from 'lucide-react';
import { TransactionWithPosition, formatOz, formatCurrency, formatNumber, formatPL } from '@/lib/calculations';
import { useDeleteTransaction } from '@/hooks/useTransactions';
import { cn } from '@/lib/utils';

interface TransactionTableProps {
  transactions: TransactionWithPosition[];
  portfolioId: string;
}

export function TransactionTable({ transactions, portfolioId }: TransactionTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteTransaction = useDeleteTransaction();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTransaction.mutateAsync({ id: deleteId, portfolioId });
    setDeleteId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Card className="shadow-luxury overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[80px]">Metal</TableHead>
                  <TableHead className="w-[60px]">Side</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Canonical (oz)</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Canonical (AED/oz)</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Holdings After</TableHead>
                  <TableHead className="text-right">Avg Cost After</TableHead>
                  <TableHead className="text-right">Realized P/L</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const pl = tx.side === 'SELL' ? formatPL(tx.realized_pl_this_tx) : { text: '—', colorClass: 'text-muted-foreground' };
                  
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {formatDate(tx.trade_date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {tx.instrument_symbol === 'XAU' ? (
                            <Coins className="h-4 w-4 text-gold" />
                          ) : (
                            <Circle className="h-4 w-4 text-silver fill-silver" />
                          )}
                          <span className={tx.instrument_symbol === 'XAU' ? 'text-gold' : 'text-silver'}>
                            {tx.instrument_symbol}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={tx.side === 'BUY' ? 'default' : 'secondary'}
                          className={cn(
                            tx.side === 'BUY' 
                              ? 'bg-positive/10 text-positive hover:bg-positive/20' 
                              : 'bg-negative/10 text-negative hover:bg-negative/20'
                          )}
                        >
                          {tx.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(tx.quantity, tx.quantity_unit === 'OZ' ? 4 : 2)}
                        <span className="text-xs text-muted-foreground ml-1">
                          {tx.quantity_unit === 'OZ' ? 'oz' : 'g'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(tx.canonical_quantity_oz, 4)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(tx.price, 2)}
                        <span className="text-xs text-muted-foreground ml-1">
                          {tx.price_unit === 'AED_PER_OZ' ? '/oz' : '/g'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(tx.canonical_price_aed_per_oz, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(tx.fees, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatNumber(tx.invested_or_proceeds_aed, 2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(tx.holding_after_oz, 4)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.average_cost_after_aed_per_oz > 0 
                          ? formatNumber(tx.average_cost_after_aed_per_oz, 2) 
                          : '—'}
                      </TableCell>
                      <TableCell className={cn("text-right font-mono", pl.colorClass)}>
                        {pl.text}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(tx.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone and will recalculate all running totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
