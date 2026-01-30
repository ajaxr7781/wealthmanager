/**
 * Precious Metals Tracker - Calculation Engine
 * 
 * All calculations use canonical units:
 * - Quantity: Troy Ounces (OZ)
 * - Price: AED per Troy Ounce (AED/oz)
 * 
 * Conversion constant: 1 troy ounce = 31.1035 grams
 */

export const OUNCE_TO_GRAM = 31.1035;

// ============================================
// UNIT CONVERSIONS
// ============================================

/**
 * Convert grams to troy ounces
 */
export function gramsToOz(grams: number): number {
  return grams / OUNCE_TO_GRAM;
}

/**
 * Convert troy ounces to grams
 */
export function ozToGrams(oz: number): number {
  return oz * OUNCE_TO_GRAM;
}

/**
 * Convert price from AED/gram to AED/oz
 */
export function pricePerGramToPerOz(pricePerGram: number): number {
  return pricePerGram * OUNCE_TO_GRAM;
}

/**
 * Convert price from AED/oz to AED/gram
 */
export function pricePerOzToPerGram(pricePerOz: number): number {
  return pricePerOz / OUNCE_TO_GRAM;
}

// ============================================
// TRANSACTION NORMALIZATION
// ============================================

export type QuantityUnit = 'OZ' | 'GRAM';
export type PriceUnit = 'AED_PER_OZ' | 'AED_PER_GRAM';
export type TransactionSide = 'BUY' | 'SELL';

export interface RawTransaction {
  id: string;
  instrument_symbol: 'XAU' | 'XAG';
  side: TransactionSide;
  trade_date: string;
  quantity: number;
  quantity_unit: QuantityUnit;
  price: number;
  price_unit: PriceUnit;
  fees: number;
  notes?: string;
  portfolio_id: string;
}

export interface NormalizedTransaction extends RawTransaction {
  canonical_quantity_oz: number;
  canonical_price_aed_per_oz: number;
  invested_or_proceeds_aed: number;
}

/**
 * Normalize a transaction to canonical units (OZ and AED/oz)
 */
export function normalizeTransaction(tx: RawTransaction): NormalizedTransaction {
  // Convert quantity to oz
  const canonical_quantity_oz = tx.quantity_unit === 'OZ' 
    ? tx.quantity 
    : gramsToOz(tx.quantity);

  // Convert price to AED/oz
  const canonical_price_aed_per_oz = tx.price_unit === 'AED_PER_OZ'
    ? tx.price
    : pricePerGramToPerOz(tx.price);

  // Calculate invested (BUY) or proceeds (SELL)
  const grossAmount = canonical_quantity_oz * canonical_price_aed_per_oz;
  const invested_or_proceeds_aed = tx.side === 'BUY'
    ? grossAmount + tx.fees  // Buys: add fees to cost
    : grossAmount - tx.fees; // Sells: subtract fees from proceeds

  return {
    ...tx,
    canonical_quantity_oz,
    canonical_price_aed_per_oz,
    invested_or_proceeds_aed,
  };
}

// ============================================
// WEIGHTED AVERAGE COST (WAC) ENGINE
// ============================================

export interface PositionState {
  holding_oz: number;
  cost_basis_aed: number;
  average_cost_aed_per_oz: number;
  total_bought_oz: number;
  total_bought_cost_aed: number;
  total_sold_oz: number;
  total_sold_proceeds_aed: number;
  realized_pl_aed: number;
}

export interface TransactionWithPosition extends NormalizedTransaction {
  holding_after_oz: number;
  average_cost_after_aed_per_oz: number;
  realized_pl_this_tx: number;
}

/**
 * Initialize empty position state
 */
export function createInitialPosition(): PositionState {
  return {
    holding_oz: 0,
    cost_basis_aed: 0,
    average_cost_aed_per_oz: 0,
    total_bought_oz: 0,
    total_bought_cost_aed: 0,
    total_sold_oz: 0,
    total_sold_proceeds_aed: 0,
    realized_pl_aed: 0,
  };
}

/**
 * Process a single transaction and update position state
 * Returns the new position state and transaction with position info
 */
export function processTransaction(
  tx: NormalizedTransaction,
  position: PositionState
): { newPosition: PositionState; txWithPosition: TransactionWithPosition } {
  const newPosition = { ...position };
  let realized_pl_this_tx = 0;

  if (tx.side === 'BUY') {
    // Add to position
    newPosition.holding_oz += tx.canonical_quantity_oz;
    newPosition.cost_basis_aed += tx.invested_or_proceeds_aed;
    newPosition.total_bought_oz += tx.canonical_quantity_oz;
    newPosition.total_bought_cost_aed += tx.invested_or_proceeds_aed;
    
    // Recalculate average cost
    newPosition.average_cost_aed_per_oz = newPosition.holding_oz > 0
      ? newPosition.cost_basis_aed / newPosition.holding_oz
      : 0;
  } else {
    // SELL - reduce position using WAC
    const sold_oz = tx.canonical_quantity_oz;
    const sold_cost_basis = sold_oz * position.average_cost_aed_per_oz;
    const proceeds = tx.invested_or_proceeds_aed;
    
    realized_pl_this_tx = proceeds - sold_cost_basis;
    
    newPosition.holding_oz -= sold_oz;
    newPosition.cost_basis_aed -= sold_cost_basis;
    newPosition.total_sold_oz += sold_oz;
    newPosition.total_sold_proceeds_aed += proceeds;
    newPosition.realized_pl_aed += realized_pl_this_tx;
    
    // Average cost stays the same after a sell (WAC method)
    // But recalculate if holdings are depleted
    if (newPosition.holding_oz <= 0) {
      newPosition.average_cost_aed_per_oz = 0;
      newPosition.cost_basis_aed = 0;
      newPosition.holding_oz = 0;
    }
  }

  const txWithPosition: TransactionWithPosition = {
    ...tx,
    holding_after_oz: newPosition.holding_oz,
    average_cost_after_aed_per_oz: newPosition.average_cost_aed_per_oz,
    realized_pl_this_tx,
  };

  return { newPosition, txWithPosition };
}

/**
 * Process all transactions for an instrument in date order
 * Returns transactions with running position info
 */
export function processTransactionHistory(
  transactions: RawTransaction[]
): { 
  transactions: TransactionWithPosition[]; 
  finalPosition: PositionState;
} {
  // Sort by trade_date, then by created_at if same date
  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = a.trade_date.localeCompare(b.trade_date);
    if (dateCompare !== 0) return dateCompare;
    return 0; // Maintain original order for same date
  });

  let position = createInitialPosition();
  const processedTxs: TransactionWithPosition[] = [];

  for (const tx of sorted) {
    const normalized = normalizeTransaction(tx);
    const { newPosition, txWithPosition } = processTransaction(normalized, position);
    position = newPosition;
    processedTxs.push(txWithPosition);
  }

  return { transactions: processedTxs, finalPosition: position };
}

// ============================================
// PORTFOLIO CALCULATIONS
// ============================================

export interface InstrumentSummary {
  symbol: 'XAU' | 'XAG';
  name: string;
  holding_oz: number;
  holding_grams: number;
  average_cost_aed_per_oz: number;
  average_cost_aed_per_gram: number;
  break_even_aed_per_oz: number;
  break_even_aed_per_gram: number;
  cost_basis_aed: number;
  current_price_aed_per_oz: number | null;
  current_price_aed_per_gram: number | null;
  current_value_aed: number | null;
  unrealized_pl_aed: number | null;
  unrealized_pl_pct: number | null;
  realized_pl_aed: number;
  total_bought_aed: number;
  total_sold_aed: number;
}

export interface PortfolioSummary {
  total_buys_aed: number;
  total_sells_aed: number;
  net_cash_invested_aed: number;
  current_value_aed: number | null;
  total_realized_pl_aed: number;
  total_unrealized_pl_aed: number | null;
  total_pl_aed: number | null;
  total_return_pct: number | null;
  instruments: InstrumentSummary[];
}

/**
 * Calculate summary for a single instrument
 */
export function calculateInstrumentSummary(
  symbol: 'XAU' | 'XAG',
  name: string,
  position: PositionState,
  currentPricePerOz: number | null
): InstrumentSummary {
  const holding_grams = ozToGrams(position.holding_oz);
  const average_cost_aed_per_gram = pricePerOzToPerGram(position.average_cost_aed_per_oz);
  
  // Break-even is the average cost (price needed to break even on holdings)
  const break_even_aed_per_oz = position.average_cost_aed_per_oz;
  const break_even_aed_per_gram = average_cost_aed_per_gram;
  
  let current_price_aed_per_gram: number | null = null;
  let current_value_aed: number | null = null;
  let unrealized_pl_aed: number | null = null;
  let unrealized_pl_pct: number | null = null;

  if (currentPricePerOz !== null) {
    current_price_aed_per_gram = pricePerOzToPerGram(currentPricePerOz);
    current_value_aed = position.holding_oz * currentPricePerOz;
    
    if (position.holding_oz > 0 && position.cost_basis_aed > 0) {
      unrealized_pl_aed = current_value_aed - position.cost_basis_aed;
      unrealized_pl_pct = (unrealized_pl_aed / position.cost_basis_aed) * 100;
    }
  }

  return {
    symbol,
    name,
    holding_oz: position.holding_oz,
    holding_grams,
    average_cost_aed_per_oz: position.average_cost_aed_per_oz,
    average_cost_aed_per_gram,
    break_even_aed_per_oz,
    break_even_aed_per_gram,
    cost_basis_aed: position.cost_basis_aed,
    current_price_aed_per_oz: currentPricePerOz,
    current_price_aed_per_gram,
    current_value_aed,
    unrealized_pl_aed,
    unrealized_pl_pct,
    realized_pl_aed: position.realized_pl_aed,
    total_bought_aed: position.total_bought_cost_aed,
    total_sold_aed: position.total_sold_proceeds_aed,
  };
}

/**
 * Calculate portfolio-level summary from instrument summaries
 */
export function calculatePortfolioSummary(
  instrumentSummaries: InstrumentSummary[]
): PortfolioSummary {
  let total_buys_aed = 0;
  let total_sells_aed = 0;
  let total_realized_pl_aed = 0;
  let current_value_aed: number | null = 0;
  let total_unrealized_pl_aed: number | null = 0;
  let hasMissingPrices = false;

  for (const inst of instrumentSummaries) {
    total_buys_aed += inst.total_bought_aed;
    total_sells_aed += inst.total_sold_aed;
    total_realized_pl_aed += inst.realized_pl_aed;

    if (inst.current_value_aed !== null) {
      current_value_aed! += inst.current_value_aed;
    } else if (inst.holding_oz > 0) {
      hasMissingPrices = true;
    }

    if (inst.unrealized_pl_aed !== null) {
      total_unrealized_pl_aed! += inst.unrealized_pl_aed;
    } else if (inst.holding_oz > 0) {
      hasMissingPrices = true;
    }
  }

  if (hasMissingPrices) {
    current_value_aed = null;
    total_unrealized_pl_aed = null;
  }

  const net_cash_invested_aed = total_buys_aed - total_sells_aed;
  
  const total_pl_aed = total_unrealized_pl_aed !== null
    ? total_realized_pl_aed + total_unrealized_pl_aed
    : null;

  const total_return_pct = total_pl_aed !== null && net_cash_invested_aed > 0
    ? (total_pl_aed / net_cash_invested_aed) * 100
    : null;

  return {
    total_buys_aed,
    total_sells_aed,
    net_cash_invested_aed,
    current_value_aed,
    total_realized_pl_aed,
    total_unrealized_pl_aed,
    total_pl_aed,
    total_return_pct,
    instruments: instrumentSummaries,
  };
}

// ============================================
// FORMATTING UTILITIES
// ============================================

/**
 * Format number with specified decimals
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format currency (AED)
 */
export function formatCurrency(value: number | null, showSymbol: boolean = true): string {
  if (value === null) return '—';
  const formatted = formatNumber(value, 2);
  return showSymbol ? `AED ${formatted}` : formatted;
}

/**
 * Format quantity in oz (4 decimals)
 */
export function formatOz(value: number): string {
  return `${formatNumber(value, 4)} oz`;
}

/**
 * Format quantity in grams (2 decimals)
 */
export function formatGrams(value: number): string {
  return `${formatNumber(value, 2)} g`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null): string {
  if (value === null) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatNumber(value, 2)}%`;
}

/**
 * Format P/L with color class
 */
export function formatPL(value: number | null): { text: string; colorClass: string } {
  if (value === null) return { text: '—', colorClass: 'text-muted-foreground' };
  const sign = value >= 0 ? '+' : '';
  const text = `${sign}${formatCurrency(value)}`;
  const colorClass = value >= 0 ? 'text-positive' : 'text-negative';
  return { text, colorClass };
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validate a transaction before saving
 */
export function validateTransaction(
  tx: Partial<RawTransaction>,
  currentHoldingOz: number,
  latestPricePerOz: number | null
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!tx.instrument_symbol) {
    errors.push({ field: 'instrument_symbol', message: 'Metal is required' });
  }
  if (!tx.side) {
    errors.push({ field: 'side', message: 'Side (Buy/Sell) is required' });
  }
  if (!tx.trade_date) {
    errors.push({ field: 'trade_date', message: 'Date is required' });
  }
  if (!tx.quantity || tx.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0' });
  }
  if (!tx.price || tx.price <= 0) {
    errors.push({ field: 'price', message: 'Price must be greater than 0' });
  }
  if (tx.fees !== undefined && tx.fees < 0) {
    errors.push({ field: 'fees', message: 'Fees cannot be negative' });
  }

  // Oversell check
  if (tx.side === 'SELL' && tx.quantity && tx.quantity_unit) {
    const sellOz = tx.quantity_unit === 'OZ' ? tx.quantity : gramsToOz(tx.quantity);
    if (sellOz > currentHoldingOz) {
      errors.push({ 
        field: 'quantity', 
        message: `Sell quantity (${formatOz(sellOz)}) exceeds current holdings (${formatOz(currentHoldingOz)})` 
      });
    }
  }

  // Price deviation warning
  if (tx.price && tx.price_unit && latestPricePerOz !== null) {
    const txPricePerOz = tx.price_unit === 'AED_PER_OZ' 
      ? tx.price 
      : pricePerGramToPerOz(tx.price);
    
    const deviation = Math.abs((txPricePerOz - latestPricePerOz) / latestPricePerOz);
    if (deviation > 0.3) {
      warnings.push(
        `Price deviates ${formatPercent(deviation * 100)} from latest price. Check units (oz vs gram).`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
