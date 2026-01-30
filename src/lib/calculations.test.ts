import { describe, it, expect } from 'vitest';
import {
  OUNCE_TO_GRAM,
  gramsToOz,
  ozToGrams,
  pricePerGramToPerOz,
  pricePerOzToPerGram,
  normalizeTransaction,
  processTransactionHistory,
  calculateInstrumentSummary,
  calculatePortfolioSummary,
  validateTransaction,
  createInitialPosition,
  RawTransaction,
} from './calculations';

describe('Unit Conversions', () => {
  it('should convert grams to oz correctly', () => {
    expect(gramsToOz(31.1035)).toBeCloseTo(1, 6);
    expect(gramsToOz(8.27)).toBeCloseTo(0.2659, 4);
    expect(gramsToOz(100)).toBeCloseTo(3.2151, 4);
  });

  it('should convert oz to grams correctly', () => {
    expect(ozToGrams(1)).toBeCloseTo(31.1035, 4);
    expect(ozToGrams(0.5)).toBeCloseTo(15.55175, 4);
    expect(ozToGrams(11.56)).toBeCloseTo(359.5565, 3);
  });

  it('should convert price per gram to per oz correctly', () => {
    expect(pricePerGramToPerOz(603.96)).toBeCloseTo(18785.27, 0);
    expect(pricePerGramToPerOz(100)).toBeCloseTo(3110.35, 1);
  });

  it('should convert price per oz to per gram correctly', () => {
    expect(pricePerOzToPerGram(18785.5)).toBeCloseTo(603.97, 1);
    expect(pricePerOzToPerGram(376.078)).toBeCloseTo(12.09, 1);
  });

  it('should round-trip conversions correctly', () => {
    const originalOz = 1.5;
    const grams = ozToGrams(originalOz);
    const backToOz = gramsToOz(grams);
    expect(backToOz).toBeCloseTo(originalOz, 10);

    const originalPriceOz = 18785.5;
    const priceGram = pricePerOzToPerGram(originalPriceOz);
    const backToPriceOz = pricePerGramToPerOz(priceGram);
    expect(backToPriceOz).toBeCloseTo(originalPriceOz, 6);
  });
});

describe('Transaction Normalization', () => {
  it('should normalize OZ/AED_PER_OZ transaction correctly', () => {
    const tx: RawTransaction = {
      id: '1',
      instrument_symbol: 'XAU',
      side: 'BUY',
      trade_date: '2025-11-09',
      quantity: 0.1,
      quantity_unit: 'OZ',
      price: 14816.07,
      price_unit: 'AED_PER_OZ',
      fees: 0,
      portfolio_id: 'p1',
    };

    const normalized = normalizeTransaction(tx);
    expect(normalized.canonical_quantity_oz).toBe(0.1);
    expect(normalized.canonical_price_aed_per_oz).toBe(14816.07);
    expect(normalized.invested_or_proceeds_aed).toBeCloseTo(1481.607, 3);
  });

  it('should normalize GRAM/AED_PER_GRAM transaction correctly', () => {
    const tx: RawTransaction = {
      id: '2',
      instrument_symbol: 'XAU',
      side: 'BUY',
      trade_date: '2026-01-30',
      quantity: 8.27,
      quantity_unit: 'GRAM',
      price: 603.96,
      price_unit: 'AED_PER_GRAM',
      fees: 0,
      portfolio_id: 'p1',
    };

    const normalized = normalizeTransaction(tx);
    expect(normalized.canonical_quantity_oz).toBeCloseTo(0.2659, 4);
    expect(normalized.canonical_price_aed_per_oz).toBeCloseTo(18785.27, 0);
    expect(normalized.invested_or_proceeds_aed).toBeCloseTo(4994.75, 0);
  });

  it('should include fees in BUY transactions', () => {
    const tx: RawTransaction = {
      id: '3',
      instrument_symbol: 'XAU',
      side: 'BUY',
      trade_date: '2025-11-09',
      quantity: 1,
      quantity_unit: 'OZ',
      price: 10000,
      price_unit: 'AED_PER_OZ',
      fees: 50,
      portfolio_id: 'p1',
    };

    const normalized = normalizeTransaction(tx);
    expect(normalized.invested_or_proceeds_aed).toBe(10050);
  });

  it('should subtract fees from SELL proceeds', () => {
    const tx: RawTransaction = {
      id: '4',
      instrument_symbol: 'XAU',
      side: 'SELL',
      trade_date: '2025-12-01',
      quantity: 1,
      quantity_unit: 'OZ',
      price: 11000,
      price_unit: 'AED_PER_OZ',
      fees: 50,
      portfolio_id: 'p1',
    };

    const normalized = normalizeTransaction(tx);
    expect(normalized.invested_or_proceeds_aed).toBe(10950);
  });
});

describe('WAC Calculation Engine', () => {
  it('should calculate WAC correctly for multiple buys', () => {
    const transactions: RawTransaction[] = [
      {
        id: '1',
        instrument_symbol: 'XAU',
        side: 'BUY',
        trade_date: '2025-11-09',
        quantity: 0.1,
        quantity_unit: 'OZ',
        price: 14816.07,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        portfolio_id: 'p1',
      },
      {
        id: '2',
        instrument_symbol: 'XAU',
        side: 'BUY',
        trade_date: '2025-12-03',
        quantity: 0.5,
        quantity_unit: 'OZ',
        price: 15603.14,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        portfolio_id: 'p1',
      },
      {
        id: '3',
        instrument_symbol: 'XAU',
        side: 'BUY',
        trade_date: '2025-12-30',
        quantity: 0.4,
        quantity_unit: 'OZ',
        price: 16154.60,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        portfolio_id: 'p1',
      },
    ];

    const { finalPosition } = processTransactionHistory(transactions);

    expect(finalPosition.holding_oz).toBeCloseTo(1.0, 4);
    expect(finalPosition.total_bought_oz).toBeCloseTo(1.0, 4);
    
    // Total invested: 1481.607 + 7801.57 + 6461.84 = 15744.99
    const expectedTotalCost = 0.1 * 14816.07 + 0.5 * 15603.14 + 0.4 * 16154.60;
    expect(finalPosition.total_bought_cost_aed).toBeCloseTo(expectedTotalCost, 2);
    
    // Average cost = total / quantity
    expect(finalPosition.average_cost_aed_per_oz).toBeCloseTo(expectedTotalCost / 1.0, 2);
  });

  it('should calculate realized P/L correctly on sell', () => {
    const transactions: RawTransaction[] = [
      {
        id: '1',
        instrument_symbol: 'XAU',
        side: 'BUY',
        trade_date: '2025-11-09',
        quantity: 1,
        quantity_unit: 'OZ',
        price: 15000,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        portfolio_id: 'p1',
      },
      {
        id: '2',
        instrument_symbol: 'XAU',
        side: 'SELL',
        trade_date: '2025-12-01',
        quantity: 0.5,
        quantity_unit: 'OZ',
        price: 16000,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        portfolio_id: 'p1',
      },
    ];

    const { transactions: txs, finalPosition } = processTransactionHistory(transactions);

    // Sell 0.5 oz at 16000 = 8000 proceeds
    // Cost basis for 0.5 oz at 15000 avg = 7500
    // Realized P/L = 8000 - 7500 = 500
    expect(txs[1].realized_pl_this_tx).toBeCloseTo(500, 2);
    expect(finalPosition.realized_pl_aed).toBeCloseTo(500, 2);
    expect(finalPosition.holding_oz).toBeCloseTo(0.5, 4);
    expect(finalPosition.average_cost_aed_per_oz).toBe(15000); // WAC stays same
  });

  it('should handle complete liquidation correctly', () => {
    const transactions: RawTransaction[] = [
      {
        id: '1',
        instrument_symbol: 'XAU',
        side: 'BUY',
        trade_date: '2025-11-09',
        quantity: 1,
        quantity_unit: 'OZ',
        price: 15000,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        portfolio_id: 'p1',
      },
      {
        id: '2',
        instrument_symbol: 'XAU',
        side: 'SELL',
        trade_date: '2025-12-01',
        quantity: 1,
        quantity_unit: 'OZ',
        price: 16000,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        portfolio_id: 'p1',
      },
    ];

    const { finalPosition } = processTransactionHistory(transactions);

    expect(finalPosition.holding_oz).toBe(0);
    expect(finalPosition.cost_basis_aed).toBe(0);
    expect(finalPosition.average_cost_aed_per_oz).toBe(0);
    expect(finalPosition.realized_pl_aed).toBeCloseTo(1000, 2);
  });

  it('should handle mixed unit transactions correctly', () => {
    const transactions: RawTransaction[] = [
      {
        id: '1',
        instrument_symbol: 'XAU',
        side: 'BUY',
        trade_date: '2025-11-09',
        quantity: 1,
        quantity_unit: 'OZ',
        price: 15000,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        portfolio_id: 'p1',
      },
      {
        id: '2',
        instrument_symbol: 'XAU',
        side: 'BUY',
        trade_date: '2025-12-01',
        quantity: 31.1035, // 1 oz in grams
        quantity_unit: 'GRAM',
        price: 482.49, // ~15000/31.1035 AED/gram
        price_unit: 'AED_PER_GRAM',
        fees: 0,
        portfolio_id: 'p1',
      },
    ];

    const { finalPosition } = processTransactionHistory(transactions);

    expect(finalPosition.holding_oz).toBeCloseTo(2, 4);
    expect(finalPosition.average_cost_aed_per_oz).toBeCloseTo(15004, -1);
  });
});

describe('Instrument Summary Calculations', () => {
  it('should calculate unrealized P/L correctly', () => {
    const position = {
      holding_oz: 1,
      cost_basis_aed: 15000,
      average_cost_aed_per_oz: 15000,
      total_bought_oz: 1,
      total_bought_cost_aed: 15000,
      total_sold_oz: 0,
      total_sold_proceeds_aed: 0,
      realized_pl_aed: 0,
    };

    const summary = calculateInstrumentSummary('XAU', 'Gold', position, 18785.5);

    expect(summary.current_value_aed).toBeCloseTo(18785.5, 2);
    expect(summary.unrealized_pl_aed).toBeCloseTo(3785.5, 2);
    expect(summary.unrealized_pl_pct).toBeCloseTo(25.24, 2);
    expect(summary.break_even_aed_per_oz).toBe(15000);
  });

  it('should handle missing price correctly', () => {
    const position = createInitialPosition();
    position.holding_oz = 1;
    position.cost_basis_aed = 15000;
    position.average_cost_aed_per_oz = 15000;

    const summary = calculateInstrumentSummary('XAU', 'Gold', position, null);

    expect(summary.current_value_aed).toBeNull();
    expect(summary.unrealized_pl_aed).toBeNull();
    expect(summary.unrealized_pl_pct).toBeNull();
  });
});

describe('Portfolio Summary Calculations', () => {
  it('should aggregate instrument summaries correctly', () => {
    const goldSummary = calculateInstrumentSummary(
      'XAU', 
      'Gold', 
      {
        holding_oz: 1,
        cost_basis_aed: 15000,
        average_cost_aed_per_oz: 15000,
        total_bought_oz: 1,
        total_bought_cost_aed: 15000,
        total_sold_oz: 0,
        total_sold_proceeds_aed: 0,
        realized_pl_aed: 0,
      }, 
      18785.5
    );

    const silverSummary = calculateInstrumentSummary(
      'XAG',
      'Silver',
      {
        holding_oz: 10,
        cost_basis_aed: 4000,
        average_cost_aed_per_oz: 400,
        total_bought_oz: 10,
        total_bought_cost_aed: 4000,
        total_sold_oz: 0,
        total_sold_proceeds_aed: 0,
        realized_pl_aed: 0,
      },
      376.078
    );

    const portfolio = calculatePortfolioSummary([goldSummary, silverSummary]);

    expect(portfolio.total_buys_aed).toBe(19000);
    expect(portfolio.net_cash_invested_aed).toBe(19000);
    expect(portfolio.current_value_aed).toBeCloseTo(18785.5 + 3760.78, 2);
  });
});

describe('Validation', () => {
  it('should detect oversell', () => {
    const result = validateTransaction(
      {
        instrument_symbol: 'XAU',
        side: 'SELL',
        quantity: 2,
        quantity_unit: 'OZ',
        price: 15000,
        price_unit: 'AED_PER_OZ',
        fees: 0,
        trade_date: '2025-12-01',
      },
      1, // current holding is only 1 oz
      15000
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'quantity')).toBe(true);
  });

  it('should warn on large price deviation', () => {
    const result = validateTransaction(
      {
        instrument_symbol: 'XAU',
        side: 'BUY',
        quantity: 1,
        quantity_unit: 'OZ',
        price: 600, // Should be ~18000, this is gram price
        price_unit: 'AED_PER_OZ',
        fees: 0,
        trade_date: '2025-12-01',
      },
      0,
      18000
    );

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('deviates');
  });

  it('should validate required fields', () => {
    const result = validateTransaction({}, 0, null);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
