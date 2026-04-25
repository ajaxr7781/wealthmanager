import type { Liability } from '@/hooks/useLiabilities';
import type { LiabilityPayment } from '@/hooks/useLiabilityPayments';

export interface LiabilityAnalysis {
  // Progress
  paidPrincipal: number;
  progressPct: number;          // by principal paid
  installmentsPaid: number;
  installmentsTotal: number | null;
  scheduleProgressPct: number;  // by installments paid / tenure
  // Payments
  totalPaid: number;
  totalInterestPaid: number;
  avgInterestPerEmi: number | null;
  // Time
  monthsElapsed: number;
  monthsRemaining: number | null;
  payoffDate: Date | null;
  // Cost projections
  projectedTotalInterest: number | null;
  projectedTotalCost: number | null;
  interestSharePct: number | null;  // interest / total cost
  // Rate diagnostics
  quotedRate: number;               // what the user entered
  effectiveAprPct: number | null;   // true reducing rate derived from EMI + tenure + principal
  scheduledEmi: number | null;
  isOverpaying: boolean;
  isFlatRateQuoted: boolean;        // quoted rate is materially lower than effective APR
}

/** Calculate EMI given principal, annual rate (%), and tenure in months. */
export function calculateEmi(principal: number, annualRatePct: number, months: number): number {
  if (!principal || !months) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/**
 * Derive the effective annual reducing rate (APR %) from principal, EMI and tenure.
 * Uses bisection on the monthly rate. Returns null if not solvable.
 */
export function deriveAprFromSchedule(principal: number, emi: number, months: number): number | null {
  if (!principal || !emi || !months || emi * months <= principal) return null;
  let lo = 0;
  let hi = 1; // 100%/month upper bound — extremely safe
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const calcEmi = mid === 0
      ? principal / months
      : (principal * mid * Math.pow(1 + mid, months)) / (Math.pow(1 + mid, months) - 1);
    if (calcEmi > emi) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 12 * 100;
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
  if (emi <= monthlyInterest) return null;
  const n = -Math.log(1 - (outstanding * r) / emi) / Math.log(1 + r);
  return Math.ceil(n);
}

export function analyzeLiability(liability: Liability, payments: LiabilityPayment[] = []): LiabilityAnalysis {
  const principal = Number(liability.principal) || 0;
  const outstanding = Number(liability.outstanding) || 0;
  const quotedRate = Number(liability.interest_rate) || 0;
  const emi = liability.emi != null ? Number(liability.emi) : null;
  const tenure = liability.tenure_months ?? null;

  const paidPrincipal = Math.max(0, principal - outstanding);
  const progressPct = principal > 0 ? Math.min(100, (paidPrincipal / principal) * 100) : 0;

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalInterestPaid = payments.reduce((s, p) => s + Number(p.interest_component || 0), 0);
  const installmentsPaid = payments.length;
  const avgInterestPerEmi = installmentsPaid > 0 ? totalInterestPaid / installmentsPaid : null;

  // Derive true reducing-balance APR from the bank's schedule when possible.
  // This is the source of truth for projections — user-entered rate may be flat/quoted.
  const effectiveAprPct = (emi && tenure && principal > 0)
    ? deriveAprFromSchedule(principal, emi, tenure)
    : null;

  // Use derived APR when available; otherwise fall back to the entered rate.
  const projectionRate = effectiveAprPct ?? quotedRate;

  // Months elapsed: prefer tenure-anchored (paid installments) over date math.
  let monthsElapsed = installmentsPaid;
  if (!monthsElapsed && payments.length === 0) monthsElapsed = 0;

  // Remaining schedule
  let monthsRemaining: number | null = null;
  let payoffDate: Date | null = null;
  let projectedTotalInterest: number | null = null;
  let projectedTotalCost: number | null = null;

  if (tenure && installmentsPaid <= tenure) {
    monthsRemaining = Math.max(0, tenure - installmentsPaid);
  } else if (emi && emi > 0) {
    monthsRemaining = monthsToPayoff(outstanding, emi, projectionRate);
  }

  if (monthsRemaining != null) {
    // Use last payment date as anchor, else today
    const lastPaymentDate = payments.length
      ? new Date(Math.max(...payments.map(p => new Date(p.payment_date).getTime())))
      : new Date();
    payoffDate = new Date(lastPaymentDate);
    payoffDate.setMonth(payoffDate.getMonth() + monthsRemaining);

    if (emi && emi > 0) {
      const futurePayments = emi * monthsRemaining;
      const remainingInterest = Math.max(0, futurePayments - outstanding);
      projectedTotalInterest = totalInterestPaid + remainingInterest;
      projectedTotalCost = principal + projectedTotalInterest;
    }
  }

  const interestSharePct = (projectedTotalCost && projectedTotalInterest)
    ? (projectedTotalInterest / projectedTotalCost) * 100
    : null;

  // Scheduled EMI per quoted rate (what EMI *should* be if rate was reducing)
  const scheduledEmi = tenure ? calculateEmi(principal, quotedRate, tenure) : null;
  const isOverpaying = !!(scheduledEmi && emi && emi > scheduledEmi * 1.05);
  // Flat-rate quoted: APR is materially higher than the entered rate (>30% gap)
  const isFlatRateQuoted = !!(effectiveAprPct && quotedRate > 0
    && effectiveAprPct > quotedRate * 1.3);

  return {
    paidPrincipal,
    progressPct,
    installmentsPaid,
    installmentsTotal: tenure,
    scheduleProgressPct: tenure ? Math.min(100, (installmentsPaid / tenure) * 100) : progressPct,
    totalPaid,
    totalInterestPaid,
    avgInterestPerEmi,
    monthsElapsed,
    monthsRemaining,
    payoffDate,
    projectedTotalInterest,
    projectedTotalCost,
    interestSharePct,
    quotedRate,
    effectiveAprPct,
    scheduledEmi,
    isOverpaying,
    isFlatRateQuoted,
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
