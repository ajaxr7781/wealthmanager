import type { Liability } from '@/hooks/useLiabilities';
import type { LiabilityPayment } from '@/hooks/useLiabilityPayments';

export interface LiabilityAnalysis {
  paidPrincipal: number;
  progressPct: number;
  totalPaid: number;
  totalInterestPaid: number;
  monthsElapsed: number;
  monthsRemaining: number | null;
  payoffDate: Date | null;
  projectedTotalInterest: number | null;
  projectedTotalCost: number | null;
  scheduledEmi: number | null;
  isOverpaying: boolean;
}

/** Calculate EMI given principal, annual rate (%), and tenure in months. */
export function calculateEmi(principal: number, annualRatePct: number, months: number): number {
  if (!principal || !months) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/**
 * Solve for months remaining given outstanding balance, EMI, and annual rate.
 * Returns null if EMI cannot cover the monthly interest (loan never amortizes).
 */
export function monthsToPayoff(outstanding: number, emi: number, annualRatePct: number): number | null {
  if (!outstanding || outstanding <= 0) return 0;
  if (!emi || emi <= 0) return null;
  const r = (annualRatePct || 0) / 100 / 12;
  if (r === 0) return Math.ceil(outstanding / emi);
  const monthlyInterest = outstanding * r;
  if (emi <= monthlyInterest) return null; // never pays off
  const n = -Math.log(1 - (outstanding * r) / emi) / Math.log(1 + r);
  return Math.ceil(n);
}

export function analyzeLiability(liability: Liability, payments: LiabilityPayment[] = []): LiabilityAnalysis {
  const principal = Number(liability.principal) || 0;
  const outstanding = Number(liability.outstanding) || 0;
  const rate = Number(liability.interest_rate) || 0;
  const emi = liability.emi != null ? Number(liability.emi) : null;
  const tenure = liability.tenure_months ?? null;

  const paidPrincipal = Math.max(0, principal - outstanding);
  const progressPct = principal > 0 ? Math.min(100, (paidPrincipal / principal) * 100) : 0;

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalInterestPaid = payments.reduce((s, p) => s + Number(p.interest_component || 0), 0);

  // Estimate months elapsed from earliest payment date to today
  let monthsElapsed = 0;
  if (payments.length) {
    const dates = payments.map((p) => new Date(p.payment_date).getTime());
    const earliest = Math.min(...dates);
    monthsElapsed = Math.max(
      0,
      Math.round((Date.now() - earliest) / (1000 * 60 * 60 * 24 * 30.4375))
    );
  }

  // Projected payoff using current EMI & rate
  let monthsRemaining: number | null = null;
  let payoffDate: Date | null = null;
  let projectedTotalInterest: number | null = null;
  let projectedTotalCost: number | null = null;

  if (emi && emi > 0) {
    monthsRemaining = monthsToPayoff(outstanding, emi, rate);
    if (monthsRemaining != null) {
      payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);
      const futurePayments = emi * monthsRemaining;
      const remainingInterest = Math.max(0, futurePayments - outstanding);
      projectedTotalInterest = totalInterestPaid + remainingInterest;
      projectedTotalCost = principal + projectedTotalInterest;
    }
  }

  // Scheduled EMI based on tenure (what the EMI *should* be)
  const scheduledEmi = tenure ? calculateEmi(principal, rate, tenure) : null;
  const isOverpaying = !!(scheduledEmi && emi && emi > scheduledEmi * 1.05);

  return {
    paidPrincipal,
    progressPct,
    totalPaid,
    totalInterestPaid,
    monthsElapsed,
    monthsRemaining,
    payoffDate,
    projectedTotalInterest,
    projectedTotalCost,
    scheduledEmi,
    isOverpaying,
  };
}

export function formatMonths(months: number | null): string {
  if (months == null) return '—';
  if (months === 0) return 'Paid off';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y}y`;
  return `${y}y ${m}m`;
}
