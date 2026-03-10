

## Fix: Merge Duplicate Precious Metal Assets

### Problem
You have duplicate asset records for Gold and Silver:

| Metal | Primary Asset | Duplicate Asset | 
|-------|--------------|-----------------|
| Gold | `fe1e69f1` — 1.554 oz, AED 25,756 (5 txns) | `d03ad5f2` "Gold Feb 2026" — 0.514 oz, AED 9,933 (2 txns) |
| Silver | `582e76db` — 11.56 oz, AED 5,012 (1 txn) | `d0f2cf04` "Silver Feb 2026" — 10 oz, AED 3,595 (1 txn) |

This causes double-counting on dashboard, liquidity breakdown, portfolio summary, and other screens.

### Fix (SQL Migration)

A single database migration that:

1. **Reassign transactions** from duplicate assets to the primary assets (update `asset_id` on 3 transaction records)
2. **Update primary asset totals** — add duplicate's quantity and cost to primary:
   - Gold: 1.554 + 0.514 = 2.068 oz, cost 25,756 + 9,933 = 35,689
   - Silver: 11.56 + 10 = 21.56 oz, cost 5,012 + 3,595 = 8,607
3. **Delete the duplicate asset records** ("Gold Feb 2026" and "Silver Feb 2026")

No UI code changes needed — the screens already aggregate by `metal_type`, so once the data is clean, everything displays correctly.

### Safety
- All operations in a single transaction (atomic)
- Transactions are preserved with their original dates, quantities, and notes
- No data loss — just consolidation

