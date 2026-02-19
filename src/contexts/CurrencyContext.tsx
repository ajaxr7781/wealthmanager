import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useUserSettings, useUpdateSettings } from '@/hooks/useAssets';
import { DEFAULT_USD_TO_AED, DEFAULT_INR_TO_AED } from '@/types/assets';

export type DisplayCurrency = 'AED' | 'INR' | 'USD';

interface CurrencyContextValue {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (currency: DisplayCurrency) => void;
  /** Convert an amount from its original currency to the display currency */
  convert: (amount: number, fromCurrency: 'AED' | 'INR' | 'USD') => number;
  /** Convert an AED amount to display currency (shorthand) */
  convertAed: (amountAed: number) => number;
  /** Format amount with the display currency symbol */
  format: (amount: number | null, options?: { decimals?: number; compact?: boolean }) => string;
  /** Format an AED amount converted to display currency */
  formatAed: (amountAed: number | null, options?: { decimals?: number; compact?: boolean }) => string;
  /** Currency symbol */
  symbol: string;
  /** FX rates */
  rates: {
    usdToAed: number;
    inrToAed: number;
  };
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const CURRENCY_SYMBOLS: Record<DisplayCurrency, string> = {
  AED: 'AED',
  INR: '₹',
  USD: '$',
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateSettings();
  
  const usdToAed = settings?.usd_to_aed_rate || DEFAULT_USD_TO_AED;
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;
  
  // Initialize from settings
  const [displayCurrency, setDisplayCurrencyLocal] = useState<DisplayCurrency>('AED');
  
  useEffect(() => {
    if (settings && (settings as any).display_currency) {
      setDisplayCurrencyLocal((settings as any).display_currency as DisplayCurrency);
    }
  }, [settings]);

  const setDisplayCurrency = useCallback((currency: DisplayCurrency) => {
    setDisplayCurrencyLocal(currency);
    // Persist to DB
    updateSettings.mutate({ display_currency: currency } as any);
  }, [updateSettings]);

  const convert = useCallback((amount: number, fromCurrency: 'AED' | 'INR' | 'USD'): number => {
    // First convert to AED (base)
    let amountAed: number;
    switch (fromCurrency) {
      case 'AED': amountAed = amount; break;
      case 'INR': amountAed = amount * inrToAed; break;
      case 'USD': amountAed = amount * usdToAed; break;
      default: amountAed = amount;
    }
    
    // Then convert from AED to display currency
    switch (displayCurrency) {
      case 'AED': return amountAed;
      case 'INR': return inrToAed > 0 ? amountAed / inrToAed : amountAed;
      case 'USD': return usdToAed > 0 ? amountAed / usdToAed : amountAed;
      default: return amountAed;
    }
  }, [displayCurrency, usdToAed, inrToAed]);

  const convertAed = useCallback((amountAed: number): number => {
    return convert(amountAed, 'AED');
  }, [convert]);

  const format = useCallback((amount: number | null, options?: { decimals?: number; compact?: boolean }): string => {
    if (amount === null) return '—';
    const decimals = options?.decimals ?? 2;
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${CURRENCY_SYMBOLS[displayCurrency]} ${formatted}`;
  }, [displayCurrency]);

  const formatAed = useCallback((amountAed: number | null, options?: { decimals?: number; compact?: boolean }): string => {
    if (amountAed === null) return '—';
    return format(convertAed(amountAed), options);
  }, [convertAed, format]);

  const value = useMemo<CurrencyContextValue>(() => ({
    displayCurrency,
    setDisplayCurrency,
    convert,
    convertAed,
    format,
    formatAed,
    symbol: CURRENCY_SYMBOLS[displayCurrency],
    rates: { usdToAed, inrToAed },
  }), [displayCurrency, setDisplayCurrency, convert, convertAed, format, formatAed, usdToAed, inrToAed]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
