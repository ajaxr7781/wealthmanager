

# Precious Metals Tracker - Implementation Plan

## Overview
A complete investment tracking application for Gold (XAU) and Silver (XAG) in AED with full Supabase authentication, accurate unit conversions, Weighted Average Cost (WAC) P/L calculations, and a beautiful Gold & Emerald visual theme.

---

## 🎨 Visual Design
**Theme: Gold & Emerald Luxury**
- Deep emerald green (#064E3B) as primary background accents
- Rich gold (#D4AF37, #F59E0B) for highlights and metallic accents
- Dark slate (#1E293B) for cards and surfaces
- Warm ivory (#FFFBEB) for light mode backgrounds
- Gradient gold shimmer effects for headers and key metrics
- Dark/light mode toggle

---

## 🔐 Phase 1: Authentication & Database

### Supabase Setup
- Enable email/password authentication
- Configure password reset flow
- Set up user profiles table linked to auth.users

### Database Schema (5 Tables)
1. **portfolios** - User portfolios with base currency (AED)
2. **instruments** - XAU/XAG reference data with conversion constant
3. **transactions** - All buys/sells with quantity/price units
4. **price_snapshots** - Manual price history
5. **user_roles** - Secure role management for RLS

### Row-Level Security
- Users can only access their own portfolios and transactions
- Security definer functions for role checks
- Proper RLS policies on all tables

---

## 📊 Phase 2: Core Calculation Engine

### Utility Functions (TypeScript)
- **Unit Conversions**: `gramsToOz()`, `ozToGrams()` using 31.1035 constant
- **Canonical Normalization**: Convert any transaction to OZ and AED/oz
- **WAC Engine**: Weighted Average Cost calculator with running totals
- **P/L Calculator**: Realized, unrealized, and total P/L
- **Position Tracker**: Holdings after each transaction in date order
- **Validation**: Oversell prevention, price deviation warnings (>30%)

### Precision Rules
- Quantities: 4 decimals (oz), 2 decimals (grams)
- Money: 2 decimals (AED)
- Internal calculations: Full precision

---

## 🏠 Phase 3: Dashboard Page

### Portfolio Summary Cards
- Net Cash Invested (Total Buys - Total Sells)
- Current Portfolio Value
- Total P/L (with color: green/red)
- Total Return %
- Realized P/L
- Unrealized P/L

### Visual Elements
- **Allocation Chart**: Donut/pie showing Gold vs Silver by current value
- **Live Prices Panel**: XAU and XAG in AED/oz and AED/gram
- **Quick Actions**: "Add Transaction" and "Update Prices" buttons
- **Portfolio Selector**: Dropdown for multiple portfolios

---

## 📝 Phase 4: Transactions (Ledger) Page

### Add/Edit Transaction Form
- Portfolio selector
- Metal picker (Gold/Silver)
- Side toggle (BUY/SELL)
- Date picker
- Quantity input + Unit dropdown (OZ/GRAM)
- Price input + Unit dropdown (AED/oz, AED/gram)
- Fees input
- Notes textarea

### Live Preview Box
Real-time calculation showing:
- Canonical quantity in oz
- Canonical price in AED/oz
- Expected invested/proceeds amount
- Warning if price deviates >30% from latest snapshot

### Ledger Table
Full transaction history with columns:
- Date | Metal | Side | Qty | Unit | Canonical Qty (oz) | Price | Price Unit | Canonical Price (AED/oz) | Fees | Invested/Proceeds | Holdings After | Avg Cost After | Realized P/L

### Features
- Filter by: instrument, date range, side
- Sticky headers for scrolling
- Row click → Details drawer with conversions, notes, audit trail
- Edit/Delete with automatic recalculation
- Backdated transaction support (recomputes in date order)

---

## 💰 Phase 5: Holdings Page

### Per-Instrument Cards (Gold & Silver)
- Current Holdings: oz and grams
- Average Cost: AED/oz and AED/gram
- Break-even Price: AED/oz and AED/gram
- Current Value: AED
- Unrealized P/L: AED and %

### Explanation Tooltips
"Explain this number" info icons showing:
- Formula used
- Input values
- Step-by-step calculation

---

## 💹 Phase 6: Prices Page

### Manual Price Update Form
- XAU price (AED/oz) with auto-convert to AED/gram display
- XAG price (AED/oz) with auto-convert to AED/gram display
- Timestamp auto-set to now (editable)
- Source field (default: "manual")

### Price History
- Simple line chart showing historical prices
- Toggle between XAU and XAG
- Time range selector (1W, 1M, 3M, YTD, All)

---

## 📈 Phase 7: Reports Page

### Monthly Performance Table
Columns per month:
- Net Invested
- Realized P/L
- Unrealized P/L
- End Value
- Monthly Return %

### Export Features
- **Export CSV**: Transactions with all columns
- **Export Holdings CSV**: Current positions summary
- **Print-Friendly Summary**: Styled view for printing

---

## 🌱 Phase 8: Seed Data

### Instruments
- XAU (Gold) - ounce_to_gram: 31.1035
- XAG (Silver) - ounce_to_gram: 31.1035

### Default Portfolio
- "Main" portfolio with AED base currency

### Sample Transactions
1. Gold: 0.100 XAU @ 14,816.07 AED/oz on 2025-11-09
2. Gold: 0.500 XAU @ 15,603.14 AED/oz on 2025-12-03
3. Gold: 0.400 XAU @ 16,154.60 AED/oz on 2025-12-30
4. Silver: 11.560 XAG @ 433.53 AED/oz on 2026-01-29
5. Gold: 8.27 grams @ 603.96 AED/gram on 2026-01-30

### Initial Prices
- XAU: 18,785.50 AED/oz
- XAG: 376.078 AED/oz

---

## ✅ Phase 9: Quality & Testing

### Unit Tests
- Conversion functions (oz↔grams)
- WAC calculation scenarios
- Sell logic with partial positions
- P/L calculations
- Oversell prevention

### Validation & Safeguards
- Prevent negative holdings (oversell error message)
- Price deviation warnings (>30% difference)
- Form validation (quantity > 0, price > 0, fees ≥ 0)

---

## 📱 Phase 10: Mobile & Polish

### Responsive Design
- Mobile-first card layouts
- Collapsible filters on small screens
- Touch-friendly inputs
- Swipe gestures for table rows

### Performance
- Optimized for 10k+ transactions
- Virtual scrolling for large tables
- Efficient recalculation on edit/delete

### Dark/Light Mode
- System preference detection
- Manual toggle in header
- Gold & Emerald colors adapted for both modes

---

## Page Summary

| Page | Description |
|------|-------------|
| **Login/Signup** | Email/password auth with password reset |
| **Dashboard** | Portfolio overview with P/L cards, allocation chart, quick actions |
| **Transactions** | Full ledger with add/edit forms, filters, running calculations |
| **Holdings** | Current positions with break-even and unrealized P/L |
| **Prices** | Manual price updates and history chart |
| **Reports** | Monthly performance and CSV exports |

