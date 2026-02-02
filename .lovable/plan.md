# InvestTracker - Multi-Asset Portfolio Manager

## Overview
A complete multi-asset investment tracking application with a **configuration-driven asset framework** supporting 7 categories and 14+ asset types. Built with full Supabase authentication, multi-currency support (AED/INR), live metal price fetching, and a beautiful Gold & Emerald visual theme.

---

## 🏗️ Architecture: Extensible Asset Model

### Configuration-Driven Design
The app uses a normalized, database-driven approach where asset categories and types are defined in configuration tables, not hardcoded. This enables:
- Dynamic sidebar navigation based on active asset types
- Easy addition of new asset types via Settings
- Automatic UI adaptation (Trades/Market sections appear only for supporting types)

### Asset Categories (7)
1. **Precious Metals** - Gold, Silver
2. **Banking & Fixed Income** - Fixed Deposits, Savings Accounts, Bonds
3. **Equity & Market-linked** - Stocks, Mutual Funds, SIPs
4. **Real Assets** - Real Estate, Land
5. **Digital Assets** - Cryptocurrency
6. **Retirement & Long-term** - NPS / Pension
7. **Other Investments** - Business Investments, Loans Given

### Asset Type Attributes
Each type is configured with:
- `supports_price_feed` - Show in Market section
- `supports_transactions` - Show in Trades section
- `valuation_method` - Live price, NAV, Maturity-based, Manual, Cost-based
- `unit_type` - Currency, Weight, Units, Area, Quantity
- `metadata_schema` - Type-specific fields

---

## 🔐 Authentication & Database

### Supabase Setup ✅
- Email/password authentication
- Password reset flow
- User profiles table linked to auth.users

### Database Schema ✅
1. **asset_categories** - Category definitions with icon/color (NEW)
2. **asset_types** - Type configurations with capabilities (NEW)
3. **assets** - User investments with normalized type codes
4. **portfolios** - User portfolios with base currency (AED)
5. **instruments** - XAU/XAG reference data with conversion constant
6. **transactions** - Precious metals buys/sells (legacy)
7. **price_snapshots** - Metal price history
8. **user_settings** - FX rates and preferences
9. **user_roles** - Secure role management for RLS

---

## 📱 Navigation (Dynamic)

### Sidebar Structure
- **Portfolio** - Unified investment overview (default)
- **Assets** (expandable)
  - All Holdings - Complete portfolio view
  - [Category-specific views] - Dynamically generated
- **Trades** - Only if types support transactions
- **Market** - Only if types support price feeds
- **Reports** - Performance & exports
- **Settings** (expandable)
  - Asset Types - Enable/disable asset types
  - Preferences - FX rates, auto-refresh

---

## 💼 Key Pages

| Page | Route | Description |
|------|-------|-------------|
| **Portfolio** | `/portfolio` or `/` | Unified dashboard |
| **All Holdings** | `/holdings` | Complete holdings by category |
| **Category Holdings** | `/holdings/:categoryCode` | Category-specific view |
| **Add Asset** | `/assets/new` | Configuration-driven form |
| **Asset Detail** | `/assets/:id` | View/delete asset |
| **Transactions** | `/transactions` | Metal transaction ledger |
| **Prices** | `/prices` | Live + manual price updates |
| **Reports** | `/reports` | Performance & exports |
| **Asset Types** | `/settings/asset-types` | Manage types |
| **Preferences** | `/settings/preferences` | User settings |

---

## 💹 Live Price Integration

### Edge Function
- `fetch-metal-prices` - Proxies goldprice.org API
- Returns USD prices, converted to AED

### Conversion Rates
- Default USD→AED: 3.6725
- Default INR→AED: 0.044
- Configurable in Settings

---

## ✅ Completed Features

- [x] Configuration-driven asset framework
- [x] 7 asset categories, 14 asset types
- [x] Dynamic sidebar navigation
- [x] Asset type management in Settings
- [x] Portfolio overview dashboard
- [x] Asset allocation breakdown
- [x] Category-based holdings views
- [x] Step-based add asset form
- [x] Asset detail page with delete
- [x] Live metal price API integration
- [x] Multi-currency support (AED/INR)
- [x] Preserved precious metals functionality
- [x] User preferences page
- [x] Safe data migration (no data loss)

---

## 🔜 Future Enhancements

- [ ] Edit asset functionality
- [ ] Custom asset type creation UI
- [ ] Asset value history tracking
- [ ] Automatic value updates for shares/MF via APIs
- [ ] Cryptocurrency price feeds
- [ ] Performance charts over time
- [ ] Mobile-optimized asset forms
- [ ] Attachment support for documents
