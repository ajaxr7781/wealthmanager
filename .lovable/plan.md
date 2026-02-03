
# India Mutual Funds + SIP Module Implementation Plan

## Executive Summary
This plan implements a fully dynamic India Mutual Funds and SIP module that automatically fetches NAVs from MFAPI and AMFI. The module is configuration-driven with no hardcoded fund names, ISINs, or scheme codes. It integrates seamlessly with the existing extensible asset framework.

---

## 1. Database Schema Design

### New Tables

#### 1.1 `mf_schemes` - User's Scheme Catalog
Stores user-configured mutual fund schemes with AMFI mapping.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (RLS) |
| `scheme_name` | TEXT | User-friendly name |
| `fund_house` | TEXT | AMC name (e.g., "HDFC Mutual Fund") |
| `category` | TEXT | Fund category (Equity, Debt, Hybrid) |
| `plan_type` | TEXT | "Regular" or "Direct" |
| `option_type` | TEXT | "Growth" or "IDCW" |
| `isin` | TEXT | ISIN code (optional) |
| `amfi_scheme_code` | INTEGER | MFAPI scheme ID (required for NAV fetch) |
| `benchmark` | TEXT | Optional benchmark index |
| `latest_nav` | NUMERIC | Last fetched NAV |
| `latest_nav_date` | DATE | NAV date |
| `nav_last_updated` | TIMESTAMPTZ | When NAV was last fetched |
| `nav_source` | TEXT | "MFAPI" or "AMFI" |
| `is_active` | BOOLEAN | Active flag |
| `needs_verification` | BOOLEAN | True if mapping needs confirmation |
| `notes` | TEXT | User notes |
| `created_at`, `updated_at` | TIMESTAMPTZ | Timestamps |

#### 1.2 `mf_scheme_master_cache` - MFAPI Master List Cache
Cached copy of MFAPI scheme master for offline search.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `scheme_code` | INTEGER | AMFI scheme code |
| `scheme_name` | TEXT | Scheme name from MFAPI |
| `cached_at` | TIMESTAMPTZ | When cached |
| `source` | TEXT | "MFAPI" or "AMFI_CSV" |

#### 1.3 `mf_holdings` - User's MF Holdings
Links user assets to schemes with folio/units.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `scheme_id` | UUID | FK to mf_schemes |
| `folio_no` | TEXT | Folio number (optional) |
| `invested_amount` | NUMERIC | Total invested |
| `units_held` | NUMERIC | Current units |
| `current_value` | NUMERIC | units * latest_nav (computed) |
| `unrealized_gain` | NUMERIC | Computed gain |
| `xirr` | NUMERIC | Computed XIRR when transactions exist |
| `is_active` | BOOLEAN | Active flag |
| `created_at`, `updated_at` | TIMESTAMPTZ | Timestamps |

#### 1.4 `mf_transactions` - MF Transaction History
Optional transaction-level detail for holdings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `holding_id` | UUID | FK to mf_holdings |
| `transaction_date` | DATE | Purchase/redemption date |
| `transaction_type` | TEXT | "PURCHASE", "REDEMPTION", "SWITCH_IN", "SWITCH_OUT" |
| `amount` | NUMERIC | Amount in INR |
| `units` | NUMERIC | Units transacted |
| `nav_at_transaction` | NUMERIC | NAV on that date |
| `notes` | TEXT | Notes |
| `created_at` | TIMESTAMPTZ | Timestamp |

#### 1.5 `mf_sips` - SIP Definitions
Stores SIP configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `scheme_id` | UUID | FK to mf_schemes |
| `folio_no` | TEXT | Optional folio |
| `sip_amount` | NUMERIC | Monthly SIP amount |
| `sip_day_of_month` | INTEGER | Day of month (1-28) |
| `start_date` | DATE | SIP start date |
| `end_date` | DATE | Optional end date |
| `status` | TEXT | "ACTIVE", "PAUSED", "COMPLETED" |
| `notes` | TEXT | Notes |
| `created_at`, `updated_at` | TIMESTAMPTZ | Timestamps |

#### 1.6 `mf_nav_history` - NAV History
Stores historical NAV data for charting.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `scheme_id` | UUID | FK to mf_schemes |
| `nav_date` | DATE | NAV date |
| `nav_value` | NUMERIC | NAV value |
| `source` | TEXT | "MFAPI" or "AMFI" |
| `fetched_at` | TIMESTAMPTZ | When fetched |
| `raw_payload_hash` | TEXT | Hash for dedup |

---

## 2. Edge Functions

### 2.1 `fetch-mf-nav` - NAV Fetch Service
```text
Purpose: Fetch latest NAV for one or more schemes
Endpoints used:
  - MFAPI Latest: GET https://api.mfapi.in/mf/{scheme_code}/latest
  - AMFI Fallback: GET https://www.amfiindia.com/spages/NAVAll.txt

Features:
  - Primary: MFAPI with 5-second timeout
  - Fallback: AMFI NAVAll.txt parsed by ISIN or normalized name
  - Exponential backoff (3 retries: 1s, 2s, 4s)
  - Rate limiting (max 10 requests/second)
  - Batch support for multiple schemes
  - Returns: { scheme_code, nav, nav_date, source, success }
```

### 2.2 `import-mf-scheme-master` - Master List Import
```text
Purpose: Import/refresh MFAPI scheme master list
Endpoints used:
  - MFAPI Master: GET https://api.mfapi.in/mf

Features:
  - Returns array of {schemeCode, schemeName}
  - Stores in mf_scheme_master_cache with timestamp
  - Only refreshes if cache is >30 days old (or forced)
  - Supports search by scheme_name substring
```

### 2.3 `import-amfi-scheme-data` - AMFI CSV Import
```text
Purpose: Import AMFI scheme data for ISIN mapping
Endpoint: GET https://portal.amfiindia.com/DownloadSchemeData_Po.aspx?mf=0

Features:
  - Parses CSV format with ISIN, Scheme Code, Scheme Name
  - Enables auto-mapping by ISIN
  - Updates mf_scheme_master_cache with source="AMFI_CSV"
```

---

## 3. UI Components & Pages

### 3.1 Settings Section: MF Schemes Catalog
**Route:** `/settings/mf-schemes`

```text
Layout:
+------------------------------------------+
| Mutual Fund Schemes                      |
| [Import Master List] [Import AMFI Data]  |
+------------------------------------------+
| Search: [________________] [+ Add Scheme]|
+------------------------------------------+
| Scheme List (Table)                      |
| Name | Fund House | Category | AMFI Code |
| ---------------------------------------- |
| HDFC Equity | HDFC MF | Equity | 119551  |
|   Status: Verified | NAV: 1234.56        |
| [Edit] [Delete] [Refresh NAV]            |
+------------------------------------------+
```

**Features:**
- Import Scheme Master button: Triggers edge function, shows progress
- Search UI: Fuzzy search cached master list
- Auto-map by ISIN: Match AMFI data to resolve scheme codes
- Add Scheme Dialog: 
  - Search from cached master (autocomplete)
  - Manual entry fallback with "needs verification" flag
- Inline NAV refresh per scheme
- Status badges: "Verified", "Needs Mapping", "NAV Error"

### 3.2 Holdings Page: MF Holdings
**Route:** `/holdings/mutual_fund` (existing category view enhanced)

```text
Layout:
+------------------------------------------+
| Mutual Fund Holdings        [+ Add Holding]
| [Refresh All NAVs] Last updated: 2 min ago
+------------------------------------------+
| Summary Cards:                           |
| Total Invested | Current Value | Returns |
| ₹5,00,000      | ₹5,75,000    | +15%    |
+------------------------------------------+
| Holdings List:                           |
| +--------------------------------------+ |
| | HDFC Equity Fund - Direct Growth    | |
| | Folio: ABC123 | Units: 150.234      | |
| | Invested: ₹2,50,000 | Value: ₹3,00,000|
| | Returns: +₹50,000 (+20%)            | |
| | [View] [Edit] [Add Transaction]      | |
| +--------------------------------------+ |
+------------------------------------------+
```

**Features:**
- Aggregates data from `mf_holdings`
- Shows latest NAV from linked `mf_schemes`
- Auto-calculates: `current_value = units * latest_nav`
- Refresh All NAVs button with progress indicator
- Click to expand shows transaction history

### 3.3 Add/Edit MF Holding
**Route:** `/mf/holdings/new`, `/mf/holdings/:id/edit`

```text
Form Fields:
- Scheme: [Dropdown from user's mf_schemes catalog]
- Folio Number: [Optional text]
- Entry Method:
  ( ) Enter totals directly
  ( ) Build from transactions

If Totals:
- Total Invested Amount (INR)
- Current Units Held

If Transactions:
- Transaction List
  | Date | Type | Amount | Units | NAV |
  | [+] Add Transaction
```

### 3.4 SIP Management
**Route:** `/mf/sips`

```text
Layout:
+------------------------------------------+
| My SIPs                      [+ Add SIP] |
+------------------------------------------+
| Active SIPs:                             |
| +--------------------------------------+ |
| | HDFC Equity Fund - Direct            | |
| | Amount: ₹10,000 | Day: 5th           | |
| | Next Due: Feb 5, 2026                | |
| | Started: Jan 2024 | Status: Active   | |
| | [Edit] [Pause] [Stop]                | |
| +--------------------------------------+ |
+------------------------------------------+
```

**Features:**
- Shows next due date calculated from `sip_day_of_month` and current date
- Status management: Active, Paused, Completed
- Multiple SIPs per scheme/folio supported
- Note: Auto-posting transactions is disabled by default (future enhancement)

### 3.5 NAV Dashboard (Enhanced Prices Page)
Extend existing `/prices` page with MF NAV section:

```text
+------------------------------------------+
| Mutual Fund NAVs                         |
| [Refresh All] Last updated: 10:30 AM IST |
+------------------------------------------+
| Scheme | Latest NAV | Date | Source |    |
| HDFC Equity | 1234.56 | Feb 3 | MFAPI |  |
| SBI Bluechip | 89.12 | Feb 3 | AMFI  |   |
+------------------------------------------+
| Status: ✓ 5/5 schemes updated            |
| Errors: ICICI Bond Fund - Needs mapping  |
+------------------------------------------+
```

---

## 4. Data Flow & Logic

### 4.1 Scheme Mapping Workflow
```text
1. User clicks "Import Scheme Master"
   → Edge function fetches api.mfapi.in/mf
   → Stores in mf_scheme_master_cache

2. User searches for scheme in catalog
   → Searches local cache
   → Shows matching results with scheme codes

3. User selects scheme → Auto-fills AMFI code
   → Attempts immediate NAV fetch to verify
   → If successful: needs_verification = false
   → If fails: needs_verification = true

4. Alternative: "Auto-map by ISIN"
   → Fetches AMFI CSV data
   → Matches user's ISIN to scheme code
   → Updates scheme record

5. Manual fallback:
   → User enters code manually
   → needs_verification = true until NAV fetch succeeds
```

### 4.2 NAV Refresh Logic
```text
Trigger: Manual button OR scheduled (daily)

For each active scheme:
  1. Check amfi_scheme_code exists
     - If missing: skip, show "needs mapping"
  
  2. Try MFAPI: GET /mf/{code}/latest
     - Timeout: 5 seconds
     - Retry: 3 times with exponential backoff
  
  3. If MFAPI fails:
     - Download NAVAll.txt from AMFI
     - Parse and match by ISIN (preferred) or name
     - Mark source as "AMFI"
  
  4. Update mf_schemes:
     - latest_nav, latest_nav_date, nav_source, nav_last_updated
  
  5. Insert into mf_nav_history (if nav_date changed)

  6. Recalculate mf_holdings:
     - current_value = units_held * latest_nav
     - unrealized_gain = current_value - invested_amount
```

### 4.3 Portfolio Metrics Calculation
```text
For each holding:
- current_value = units_held × scheme.latest_nav
- unrealized_gain = current_value - invested_amount
- absolute_return_pct = (unrealized_gain / invested_amount) × 100

If transaction history exists:
- Calculate weighted CAGR
- Calculate XIRR using cashflows
```

### 4.4 SIP Next Due Date
```text
function getNextSipDueDate(sip):
  today = current_date
  next_due = Date(today.year, today.month, sip.sip_day_of_month)
  
  if next_due <= today:
    next_due = next_due.addMonths(1)
  
  if sip.end_date && next_due > sip.end_date:
    return null // SIP completed
  
  return next_due
```

---

## 5. File Structure

### New Files to Create

```text
# Database Migration
supabase/migrations/YYYYMMDD_mf_module.sql

# Edge Functions
supabase/functions/fetch-mf-nav/index.ts
supabase/functions/import-mf-scheme-master/index.ts
supabase/functions/import-amfi-scheme-data/index.ts

# Types
src/types/mutualFunds.ts

# Hooks
src/hooks/useMfSchemes.ts
src/hooks/useMfHoldings.ts
src/hooks/useMfSips.ts
src/hooks/useMfNav.ts

# Pages
src/pages/settings/MfSchemes.tsx
src/pages/mf/SipList.tsx
src/pages/mf/AddMfHolding.tsx
src/pages/mf/EditMfHolding.tsx
src/pages/mf/MfHoldingDetail.tsx

# Components
src/components/mf/SchemeSearchDialog.tsx
src/components/mf/SchemeCard.tsx
src/components/mf/HoldingCard.tsx
src/components/mf/SipCard.tsx
src/components/mf/NavRefreshButton.tsx
src/components/mf/TransactionTable.tsx
```

### Files to Modify

```text
# Navigation
src/components/layout/DynamicSidebar.tsx - Add MF-specific nav items
src/App.tsx - Add new routes

# Prices page
src/pages/Prices.tsx - Add MF NAV section

# Settings
src/pages/settings/AssetTypes.tsx - Link to MF Schemes config
```

---

## 6. Security Considerations

### Row Level Security (RLS)
All new tables will have RLS enabled with user isolation:

```sql
-- Example for mf_schemes
CREATE POLICY "Users can manage their own schemes"
ON mf_schemes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- mf_scheme_master_cache is read-only for all authenticated users
CREATE POLICY "Anyone can read scheme cache"
ON mf_scheme_master_cache FOR SELECT
USING (auth.uid() IS NOT NULL);
```

### Input Validation
- AMFI scheme codes: Validate as positive integers
- ISIN format: Validate with regex `^INF[0-9A-Z]{9}$`
- Amounts: Positive numbers only
- SIP day: 1-28 range only (avoiding month-end complexity)

---

## 7. Technical Considerations

### Rate Limiting & Caching
- MFAPI has no documented rate limit but we'll self-impose 10 req/sec
- Scheme master cache: Refresh monthly or on-demand
- NAV cache: Respect nav_date (don't re-fetch same date)

### Error Handling
- MFAPI 4xx/5xx → Fallback to AMFI
- AMFI download failure → Show error, retain old NAV
- Network timeout → Retry with backoff
- Invalid scheme code → Mark as "needs verification"

### Timezone Handling
- NAVs are published in IST (UTC+5:30)
- Store all timestamps in UTC
- Display in user's local timezone with IST reference for NAV times

---

## 8. Implementation Order

### Phase 1: Foundation (Database + Edge Functions)
1. Create database migration with all tables
2. Implement `import-mf-scheme-master` edge function
3. Implement `fetch-mf-nav` edge function with AMFI fallback
4. Create TypeScript types

### Phase 2: Settings UI
5. Create `MfSchemes.tsx` settings page
6. Implement scheme search and add functionality
7. Add inline NAV refresh capability

### Phase 3: Holdings & Transactions
8. Create `useMfHoldings` hook
9. Enhance category holdings view for mutual funds
10. Create add/edit holding forms
11. Implement transaction entry

### Phase 4: SIP Management
12. Create SIP list page
13. Implement SIP CRUD operations
14. Add next due date calculation

### Phase 5: Integration & Polish
15. Add MF section to Prices page
16. Update navigation sidebar
17. Add bulk NAV refresh functionality
18. Error states and loading indicators

---

## 9. Testing Checklist

- [ ] Scheme master import works and populates cache
- [ ] Scheme search returns accurate results
- [ ] NAV fetch works for valid scheme codes
- [ ] AMFI fallback triggers when MFAPI fails
- [ ] Holding values calculate correctly
- [ ] SIP next due dates are accurate
- [ ] RLS prevents cross-user data access
- [ ] Error states display correctly
- [ ] Rate limiting prevents API abuse
