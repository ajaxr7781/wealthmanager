import { useCurrency, type DisplayCurrency } from '@/contexts/CurrencyContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CURRENCIES: { value: DisplayCurrency; label: string; symbol: string }[] = [
  { value: 'AED', label: 'AED', symbol: 'د.إ' },
  { value: 'INR', label: 'INR', symbol: '₹' },
  { value: 'USD', label: 'USD', symbol: '$' },
];

export function CurrencySelector({ className }: { className?: string }) {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const current = CURRENCIES.find(c => c.value === displayCurrency)!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-1.5 px-2.5 font-medium text-sm", className)}
        >
          <span className="text-base leading-none">{current.symbol}</span>
          <span>{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px] bg-popover z-50">
        {CURRENCIES.map((currency) => (
          <DropdownMenuItem
            key={currency.value}
            onClick={() => setDisplayCurrency(currency.value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              displayCurrency === currency.value && "bg-accent font-semibold"
            )}
          >
            <span className="text-base w-5 text-center">{currency.symbol}</span>
            <span>{currency.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
