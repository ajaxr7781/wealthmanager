/**
 * Fixed Deposit Calculation Utilities
 */

export interface FDDetails {
  principal: number;
  interestRate: number; // Annual rate in percentage
  purchaseDate: string;
  maturityDate?: string;
  maturityAmount?: number;
}

/**
 * Calculate accrued interest for a fixed deposit
 * Uses simple interest formula: I = P * r * t
 */
export function calculateAccruedInterest(fd: FDDetails, asOfDate: Date = new Date()): number {
  if (!fd.principal || !fd.interestRate || !fd.purchaseDate) return 0;
  
  const start = new Date(fd.purchaseDate);
  const now = asOfDate;
  
  // Calculate days elapsed
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  
  // Simple interest calculation: I = P * r * t (where t is in years)
  const yearsElapsed = daysElapsed / 365;
  const interest = fd.principal * (fd.interestRate / 100) * yearsElapsed;
  
  return interest;
}

/**
 * Calculate current value of FD (principal + accrued interest)
 */
export function calculateFDCurrentValue(fd: FDDetails, asOfDate: Date = new Date()): number {
  const interest = calculateAccruedInterest(fd, asOfDate);
  return fd.principal + interest;
}

/**
 * Calculate maturity amount if not provided
 * Uses compound interest formula: A = P(1 + r/n)^(nt)
 * Assuming annual compounding (n=1)
 */
export function calculateMaturityAmount(fd: FDDetails): number | null {
  if (!fd.principal || !fd.interestRate || !fd.purchaseDate || !fd.maturityDate) {
    return null;
  }
  
  const start = new Date(fd.purchaseDate);
  const maturity = new Date(fd.maturityDate);
  
  // Calculate years to maturity
  const daysToMaturity = Math.floor((maturity.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const yearsToMaturity = daysToMaturity / 365;
  
  // Compound interest formula (annual compounding)
  const rate = fd.interestRate / 100;
  const amount = fd.principal * Math.pow(1 + rate, yearsToMaturity);
  
  return amount;
}

/**
 * Get the effective current value for an FD asset
 * Prioritizes: manual override > accrued value > principal
 */
export function getEffectiveFDValue(
  asset: {
    principal?: number | null;
    interest_rate?: number | null;
    purchase_date: string;
    maturity_date?: string | null;
    maturity_amount?: number | null;
    current_value?: number | null;
    is_current_value_manual?: boolean | null;
    total_cost: number;
  },
  asOfDate: Date = new Date()
): { currentValue: number; method: 'manual' | 'accrued' | 'principal' | 'maturity' } {
  // If manual override is set
  if (asset.is_current_value_manual && asset.current_value) {
    return { currentValue: asset.current_value, method: 'manual' };
  }
  
  // Check if FD has matured
  if (asset.maturity_date) {
    const maturityDate = new Date(asset.maturity_date);
    if (asOfDate >= maturityDate) {
      // Use maturity amount if available, otherwise calculate
      if (asset.maturity_amount) {
        return { currentValue: asset.maturity_amount, method: 'maturity' };
      }
    }
  }
  
  // Calculate accrued value if we have interest rate
  if (asset.principal && asset.interest_rate) {
    const currentValue = calculateFDCurrentValue({
      principal: asset.principal,
      interestRate: asset.interest_rate,
      purchaseDate: asset.purchase_date,
      maturityDate: asset.maturity_date || undefined,
    }, asOfDate);
    return { currentValue, method: 'accrued' };
  }
  
  // Fall back to principal or total_cost
  return { 
    currentValue: asset.principal || asset.total_cost, 
    method: 'principal' 
  };
}

/**
 * Format FD status for display
 */
export function getFDStatus(maturityDate: string | null | undefined): {
  status: 'active' | 'matured' | 'unknown';
  label: string;
  daysRemaining?: number;
} {
  if (!maturityDate) {
    return { status: 'unknown', label: 'No maturity date' };
  }
  
  const maturity = new Date(maturityDate);
  const now = new Date();
  const daysRemaining = Math.floor((maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    return { status: 'matured', label: 'Matured', daysRemaining: 0 };
  }
  
  if (daysRemaining === 0) {
    return { status: 'matured', label: 'Matures today', daysRemaining: 0 };
  }
  
  if (daysRemaining <= 30) {
    return { status: 'active', label: `${daysRemaining} days left`, daysRemaining };
  }
  
  if (daysRemaining <= 365) {
    const months = Math.floor(daysRemaining / 30);
    return { status: 'active', label: `${months} month${months > 1 ? 's' : ''} left`, daysRemaining };
  }
  
  const years = Math.floor(daysRemaining / 365);
  const remainingMonths = Math.floor((daysRemaining % 365) / 30);
  return { 
    status: 'active', 
    label: `${years}y ${remainingMonths}m left`, 
    daysRemaining 
  };
}
