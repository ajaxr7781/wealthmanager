// Mutual Fund Types for India MF + SIP Module

export interface MfScheme {
  id: string;
  user_id: string;
  scheme_name: string;
  fund_house: string | null;
  category: string | null;
  plan_type: 'Regular' | 'Direct' | null;
  option_type: 'Growth' | 'IDCW' | 'Dividend' | null;
  isin: string | null;
  amfi_scheme_code: number | null;
  benchmark: string | null;
  latest_nav: number | null;
  latest_nav_date: string | null;
  nav_last_updated: string | null;
  nav_source: 'MFAPI' | 'AMFI' | 'MANUAL' | null;
  is_active: boolean;
  needs_verification: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MfSchemeInsert {
  user_id: string;
  scheme_name: string;
  fund_house?: string;
  category?: string;
  plan_type?: 'Regular' | 'Direct';
  option_type?: 'Growth' | 'IDCW' | 'Dividend';
  isin?: string;
  amfi_scheme_code?: number;
  benchmark?: string;
  notes?: string;
  is_active?: boolean;
  needs_verification?: boolean;
}

export interface MfSchemeMasterCache {
  id: string;
  scheme_code: number;
  scheme_name: string;
  isin: string | null;
  fund_house: string | null;
  cached_at: string;
  source: 'MFAPI' | 'AMFI_CSV';
}

export interface MfHolding {
  id: string;
  user_id: string;
  scheme_id: string;
  folio_no: string | null;
  invested_amount: number;
  units_held: number;
  current_value: number | null;
  unrealized_gain: number | null;
  absolute_return_pct: number | null;
  xirr: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined scheme data
  scheme?: MfScheme;
}

export interface MfHoldingInsert {
  user_id: string;
  scheme_id: string;
  folio_no?: string;
  invested_amount: number;
  units_held: number;
  is_active?: boolean;
}

export interface MfTransaction {
  id: string;
  holding_id: string;
  transaction_date: string;
  transaction_type: 'PURCHASE' | 'REDEMPTION' | 'SWITCH_IN' | 'SWITCH_OUT' | 'DIVIDEND';
  amount: number;
  units: number;
  nav_at_transaction: number | null;
  notes: string | null;
  created_at: string;
}

export interface MfTransactionInsert {
  holding_id: string;
  transaction_date: string;
  transaction_type: 'PURCHASE' | 'REDEMPTION' | 'SWITCH_IN' | 'SWITCH_OUT' | 'DIVIDEND';
  amount: number;
  units: number;
  nav_at_transaction?: number;
  notes?: string;
}

export interface MfSip {
  id: string;
  user_id: string;
  scheme_id: string;
  holding_id: string | null;
  folio_no: string | null;
  sip_amount: number;
  sip_day_of_month: number;
  start_date: string;
  end_date: string | null;
  opening_balance: number;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined scheme data
  scheme?: MfScheme;
}

export interface MfSipInsert {
  user_id: string;
  scheme_id: string;
  holding_id?: string;
  folio_no?: string;
  sip_amount: number;
  sip_day_of_month: number;
  start_date: string;
  end_date?: string;
  opening_balance?: number;
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

// Calculate total invested for a SIP (opening balance + calculated installments)
export function calculateSipTotalInvested(sip: MfSip): number {
  const openingBalance = sip.opening_balance || 0;
  const startDate = new Date(sip.start_date);
  const endDate = sip.end_date ? new Date(sip.end_date) : new Date();
  
  // Calculate number of months between start and end/today
  const months = Math.max(0,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    (endDate.getDate() >= sip.sip_day_of_month ? 1 : 0)
  );
  
  return openingBalance + (months * sip.sip_amount);
}

export interface MfNavHistory {
  id: string;
  scheme_id: string;
  nav_date: string;
  nav_value: number;
  source: 'MFAPI' | 'AMFI' | 'MANUAL';
  fetched_at: string;
  raw_payload_hash: string | null;
}

// API Response Types
export interface NavFetchResult {
  scheme_id: string;
  scheme_code: number;
  nav: number | null;
  nav_date: string | null;
  source: 'MFAPI' | 'AMFI' | null;
  success: boolean;
  error?: string;
}

export interface NavFetchResponse {
  success: boolean;
  total: number;
  success_count: number;
  failed_count: number;
  results: NavFetchResult[];
  message: string;
}

export interface SchemeMasterImportResponse {
  success: boolean;
  source: 'cache' | 'mfapi';
  cache_age_days?: number;
  total_schemes?: number;
  cached_count?: number;
  count: number;
  schemes: Array<{ scheme_code: number; scheme_name: string }>;
  message: string;
}

// Utility function to calculate next SIP due date
export function getNextSipDueDate(sip: MfSip): Date | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Start from start_date if in future
  const startDate = new Date(sip.start_date);
  let nextDue = new Date(
    Math.max(today.getFullYear(), startDate.getFullYear()),
    Math.max(today.getMonth(), startDate.getMonth()),
    sip.sip_day_of_month
  );
  
  // If already past this month's date, move to next month
  if (nextDue <= today) {
    nextDue.setMonth(nextDue.getMonth() + 1);
  }
  
  // Check if before start date
  if (nextDue < startDate) {
    nextDue = new Date(startDate);
    nextDue.setDate(sip.sip_day_of_month);
    if (nextDue < startDate) {
      nextDue.setMonth(nextDue.getMonth() + 1);
    }
  }
  
  // Check if past end date
  if (sip.end_date) {
    const endDate = new Date(sip.end_date);
    if (nextDue > endDate) {
      return null; // SIP completed
    }
  }
  
  return nextDue;
}

// Format currency in INR
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format NAV value
export function formatNAV(nav: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(nav);
}

// Format percentage
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
