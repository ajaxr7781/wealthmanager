/**
 * XIRR & CAGR calculation utilities
 */

interface CashFlow {
  date: Date;
  amount: number; // negative for investments, positive for returns
}

/**
 * Calculate XIRR using Newton's method
 */
export function calculateXIRR(cashflows: CashFlow[]): number | null {
  if (cashflows.length < 2) return null;

  const sorted = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const d0 = sorted[0].date.getTime();

  const yearFrac = (d: Date) => (d.getTime() - d0) / (365.25 * 24 * 60 * 60 * 1000);

  // NPV function
  const npv = (rate: number) => {
    return sorted.reduce((sum, cf) => {
      const t = yearFrac(cf.date);
      return sum + cf.amount / Math.pow(1 + rate, t);
    }, 0);
  };

  // NPV derivative
  const dnpv = (rate: number) => {
    return sorted.reduce((sum, cf) => {
      const t = yearFrac(cf.date);
      if (t === 0) return sum;
      return sum - t * cf.amount / Math.pow(1 + rate, t + 1);
    }, 0);
  };

  // Newton-Raphson
  let guess = 0.1;
  for (let i = 0; i < 100; i++) {
    const f = npv(guess);
    const df = dnpv(guess);
    if (Math.abs(df) < 1e-10) break;
    const next = guess - f / df;
    if (Math.abs(next - guess) < 1e-7) return next;
    guess = next;
    if (guess < -1 || guess > 10) return null; // diverged
  }

  return Math.abs(npv(guess)) < 1 ? guess : null;
}

/**
 * Calculate CAGR
 */
export function calculateCAGR(
  beginValue: number,
  endValue: number,
  years: number
): number | null {
  if (beginValue <= 0 || endValue <= 0 || years <= 0) return null;
  return Math.pow(endValue / beginValue, 1 / years) - 1;
}

/**
 * Format rate as percentage string
 */
export function formatRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${(rate * 100).toFixed(2)}%`;
}
