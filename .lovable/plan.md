# InvestTracker - Multi-Asset Portfolio Manager

## Overview
A complete multi-asset investment tracking application supporting Precious Metals, Real Estate, Fixed Deposits, SIP, Mutual Funds, and Shares. Built with full Supabase authentication, multi-currency support (AED/INR), live metal price fetching, and a beautiful Gold & Emerald visual theme.

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

## 🔐 Authentication & Database

### Supabase Setup ✅
- Email/password authentication
- Password reset flow
- User profiles table linked to auth.users

### Database Schema ✅
1. **portfolios** - User portfolios with base currency (AED)
2. **instruments** - XAU/XAG reference data with conversion constant
3. **transactions** - Precious metals buys/sells with quantity/price units
4. **price_snapshots** - Metal price history
5. **user_roles** - Secure role management for RLS
6. **assets** - Multi-asset tracking table (NEW)
7. **user_settings** - User preferences for FX rates, etc. (NEW)

### Asset Types Supported ✅
- `precious_metals` - Gold & Silver
- `real_estate` - Land, House/Villa
- `fixed_deposit` - Bank FDs
- `sip` - Systematic Investment Plans
- `mutual_fund` - Mutual Funds
- `shares` - Stocks/Shares

---

## 💼 Portfolio Dashboard (NEW) ✅

### Summary Cards
- Total Invested (across all assets)
- Total Current Value
- Total P/L (AED and %)
- Asset Count

### Allocation Breakdown
- Pie chart showing allocation by asset type
- Detailed breakdown with P/L per category

### Asset List
- All assets with quick P/L indicators
- Link to detailed asset view

### Live Metal Prices
- Real-time gold/silver prices from API
- USD to AED conversion
- Refresh button

---

## 📝 Add Asset Flow (NEW) ✅

### Step-Based Form
1. **Select Asset Type** - Choose from 6 asset categories
2. **Basic Information** - Name, currency, date, cost, quantity
3. **Type-Specific Details** - Conditional fields per asset type

### Conditional Fields
- **Precious Metals**: Metal type (XAU/XAG)
- **Real Estate**: Location, area, rental income
- **Fixed Deposit**: Bank, interest rate, maturity date
- **SIP/MF/Shares**: Instrument name, broker, NAV

---

## 💹 Live Price Fetching (NEW) ✅

### Edge Function
- `fetch-metal-prices` - Proxies goldprice.org API
- Returns USD prices, converted to AED

### Features
- Refresh button for manual update
- Auto-fetch on page load
- Save to history button
- Fallback to manual entry if API fails

### Conversion Rate
- Default USD→AED: 3.6725
- Default INR→AED: 0.044
- Configurable in user settings

---

## 📊 Precious Metals Module (Original) ✅

### Features Preserved
- WAC (Weighted Average Cost) calculations
- Transaction ledger with running balances
- Holdings page with break-even analysis
- Price history charts
- CSV export for reports

### Calculation Engine
- Unit conversions (oz ↔ grams) using 31.1035
- Canonical normalization to OZ and AED/oz
- Realized, unrealized, and total P/L

---

## 📱 Navigation

| Page | Route | Description |
|------|-------|-------------|
| **Portfolio** | `/portfolio` | Unified investment overview (NEW) |
| **Add Asset** | `/assets/new` | Step-based asset creation (NEW) |
| **Asset Detail** | `/assets/:id` | View/delete individual asset (NEW) |
| **Precious Metals** | `/` | Gold & Silver dashboard |
| **Transactions** | `/transactions` | Metal transaction ledger |
| **Holdings** | `/holdings` | Metal positions |
| **Prices** | `/prices` | Live + manual price updates |
| **Reports** | `/reports` | Performance & exports |

---

## ✅ Completed Features

- [x] Multi-asset database schema
- [x] Portfolio overview dashboard
- [x] Asset allocation chart
- [x] Step-based add asset form
- [x] Asset detail page with delete
- [x] Live metal price API integration
- [x] Edge function for price fetching
- [x] Multi-currency support (AED/INR)
- [x] Preserved precious metals functionality
- [x] Updated navigation and branding

---

## 🔜 Future Enhancements

- [ ] Edit asset functionality
- [ ] Asset value history tracking
- [ ] Automatic value updates for shares/MF via APIs
- [ ] Currency conversion on display
- [ ] Performance charts over time
- [ ] Mobile-optimized asset forms
- [ ] Attachment support for documents
