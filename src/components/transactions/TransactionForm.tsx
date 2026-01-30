import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useCreateTransaction, CreateTransactionInput } from '@/hooks/useTransactions';
import { 
  gramsToOz, 
  pricePerGramToPerOz, 
  formatOz, 
  formatCurrency,
  validateTransaction,
} from '@/lib/calculations';

const formSchema = z.object({
  instrument_symbol: z.enum(['XAU', 'XAG']),
  side: z.enum(['BUY', 'SELL']),
  trade_date: z.string().min(1, 'Date is required'),
  quantity: z.string().min(1, 'Quantity is required').refine(
    val => !isNaN(Number(val)) && Number(val) > 0,
    'Quantity must be greater than 0'
  ),
  quantity_unit: z.enum(['OZ', 'GRAM']),
  price: z.string().min(1, 'Price is required').refine(
    val => !isNaN(Number(val)) && Number(val) > 0,
    'Price must be greater than 0'
  ),
  price_unit: z.enum(['AED_PER_OZ', 'AED_PER_GRAM']),
  fees: z.string().refine(
    val => val === '' || (!isNaN(Number(val)) && Number(val) >= 0),
    'Fees must be 0 or greater'
  ),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface TransactionFormProps {
  portfolioId: string;
  currentHoldings: { XAU: number; XAG: number };
  latestPrices: { XAU: number | null; XAG: number | null };
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  portfolioId,
  currentHoldings,
  latestPrices,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const createTransaction = useCreateTransaction();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instrument_symbol: 'XAU',
      side: 'BUY',
      trade_date: new Date().toISOString().split('T')[0],
      quantity: '',
      quantity_unit: 'OZ',
      price: '',
      price_unit: 'AED_PER_OZ',
      fees: '0',
      notes: '',
    },
  });

  const watchedValues = form.watch();

  // Calculate live preview
  const preview = useMemo(() => {
    const qty = Number(watchedValues.quantity) || 0;
    const price = Number(watchedValues.price) || 0;
    const fees = Number(watchedValues.fees) || 0;

    if (qty === 0 || price === 0) return null;

    const canonicalQtyOz = watchedValues.quantity_unit === 'OZ' 
      ? qty 
      : gramsToOz(qty);

    const canonicalPricePerOz = watchedValues.price_unit === 'AED_PER_OZ'
      ? price
      : pricePerGramToPerOz(price);

    const grossAmount = canonicalQtyOz * canonicalPricePerOz;
    const totalAmount = watchedValues.side === 'BUY'
      ? grossAmount + fees
      : grossAmount - fees;

    return {
      canonicalQtyOz,
      canonicalPricePerOz,
      totalAmount,
      label: watchedValues.side === 'BUY' ? 'Total Invested' : 'Total Proceeds',
    };
  }, [watchedValues]);

  // Validation warnings
  const validation = useMemo(() => {
    const instrument = watchedValues.instrument_symbol as 'XAU' | 'XAG';
    const holding = currentHoldings[instrument];
    const latestPrice = latestPrices[instrument];

    return validateTransaction(
      {
        instrument_symbol: instrument,
        side: watchedValues.side as 'BUY' | 'SELL',
        quantity: Number(watchedValues.quantity),
        quantity_unit: watchedValues.quantity_unit as 'OZ' | 'GRAM',
        price: Number(watchedValues.price),
        price_unit: watchedValues.price_unit as 'AED_PER_OZ' | 'AED_PER_GRAM',
        fees: Number(watchedValues.fees),
        trade_date: watchedValues.trade_date,
      },
      holding,
      latestPrice
    );
  }, [watchedValues, currentHoldings, latestPrices]);

  const onSubmit = async (data: FormData) => {
    const input: CreateTransactionInput = {
      portfolio_id: portfolioId,
      instrument_symbol: data.instrument_symbol,
      side: data.side,
      trade_date: data.trade_date,
      quantity: Number(data.quantity),
      quantity_unit: data.quantity_unit,
      price: Number(data.price),
      price_unit: data.price_unit,
      fees: Number(data.fees) || 0,
      notes: data.notes || undefined,
    };

    try {
      await createTransaction.mutateAsync(input);
      onSuccess();
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Metal & Side Row */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="instrument_symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Metal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select metal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="XAU">Gold (XAU)</SelectItem>
                    <SelectItem value="XAG">Silver (XAG)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="side"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Side</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Buy or Sell" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BUY">Buy</SelectItem>
                    <SelectItem value="SELL">Sell</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Date */}
        <FormField
          control={form.control}
          name="trade_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantity Row */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any"
                    placeholder="0.0000"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OZ">Troy Oz</SelectItem>
                    <SelectItem value="GRAM">Grams</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Price Row */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="any"
                    placeholder="0.00"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Per</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="AED_PER_OZ">AED/oz</SelectItem>
                    <SelectItem value="AED_PER_GRAM">AED/g</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Fees */}
        <FormField
          control={form.control}
          name="fees"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fees (AED)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="any"
                  placeholder="0.00"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any notes about this transaction..."
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Live Preview */}
        {preview && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canonical Quantity:</span>
                <span className="font-medium">{formatOz(preview.canonicalQtyOz)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canonical Price:</span>
                <span className="font-medium">AED {preview.canonicalPricePerOz.toFixed(2)}/oz</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">{preview.label}:</span>
                <span className="font-bold text-primary">
                  {formatCurrency(preview.totalAmount)}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Validation Errors */}
        {!validation.valid && validation.errors.filter(e => e.field === 'quantity').map((error, i) => (
          <Alert variant="destructive" key={i}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ))}

        {/* Validation Warnings */}
        {validation.warnings.map((warning, i) => (
          <Alert key={i} className="border-accent">
            <AlertTriangle className="h-4 w-4 text-accent" />
            <AlertDescription className="text-accent-foreground">{warning}</AlertDescription>
          </Alert>
        ))}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createTransaction.isPending || !validation.valid}
          >
            {createTransaction.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Transaction'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
