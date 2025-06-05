# Investment Platform - Developer Documentation

## Overview

This document covers the recently implemented features for the investment platform, focusing on rollover investments, investor-facing endpoints, and proper admin fee handling.

## Table of Contents

1. [Rollover Investment System](#rollover-investment-system)
2. [Database Schema](#database-schema)
3. [Investor-Facing Features](#investor-facing-features)
4. [Server Actions Architecture](#server-actions-architecture)
5. [Logging and Debugging](#logging-and-debugging)
6. [API Reference](#api-reference)
7. [Business Logic](#business-logic)

---

## Rollover Investment System

### Overview

The rollover system allows investments to be extended/renewed without applying additional admin fees. This prevents double-charging investors when they continue their investment.

### Key Features

- **Parent-Child Relationship**: Rollover accounts link to their original parent account
- **No Double Admin Fees**: Rollover accounts use the full final balance without additional fees
- **Sequence Tracking**: Multiple rollover generations are supported
- **Automatic Filtering**: Parent accounts are excluded when rollover children exist

### Example Flow

```
Original Investment (RAFIE-FIX-001):
├── Gross Capital: Rp 1,000,000,000
├── Admin Fee (5%): Rp 50,000,000
└── Net Capital: Rp 950,000,000

↓ Investment grows to Rp 1,114,898,428.33

Rollover Investment (RAFIE-ROLLOVER-001-FIXED):
├── Gross Capital: Rp 1,114,898,428.33 (full final balance)
├── Admin Fee: Rp 0 (no additional fee)
└── Net Capital: Rp 1,114,898,428.33 (full amount working)
```

---

## Database Schema

### New Rollover Fields

Added to `accounts` table:

```sql
-- Rollover functionality fields
is_rollover BOOLEAN DEFAULT FALSE,
parent_account_id INTEGER REFERENCES accounts(id),
admin_fee_applied BOOLEAN DEFAULT TRUE,
rollover_sequence INTEGER DEFAULT 0
```

### Field Descriptions

| Field               | Type      | Description                                             |
| ------------------- | --------- | ------------------------------------------------------- |
| `is_rollover`       | `BOOLEAN` | TRUE if this account is a rollover from another account |
| `parent_account_id` | `INTEGER` | Reference to the original account this rollover extends |
| `admin_fee_applied` | `BOOLEAN` | FALSE for rollover accounts (no additional admin fee)   |
| `rollover_sequence` | `INTEGER` | Sequence number: 0=original, 1=first rollover, etc.     |

### Constraints

```sql
-- Ensure rollover accounts have parent
ALTER TABLE accounts
ADD CONSTRAINT chk_rollover_has_parent
CHECK (
    (is_rollover = FALSE AND parent_account_id IS NULL) OR
    (is_rollover = TRUE AND parent_account_id IS NOT NULL)
);
```

### Migration Scripts

- **`add_rollover_fields.sql`** - Adds rollover columns and constraints
- **`delete_old_rollover.sql`** - Removes incorrect rollover records
- **`rafie_rollover_investment_fixed.sql`** - Creates properly structured rollover

---

## Investor-Facing Features

### Core Functionality

Provides investors with a clear view of their **net invested fund** (amount actually working for them after admin fees).

### Key Metrics

| Metric                 | Description                                        |
| ---------------------- | -------------------------------------------------- |
| **Total Net Fund**     | Amount actively earning returns (after admin fees) |
| **Total Gross Fund**   | Original investment amounts                        |
| **Total Admin Fees**   | Cumulative fees paid                               |
| **Active Investments** | Number of current investment accounts              |

### Rollover Handling

- **Original accounts with rollovers**: Excluded from totals (prevents double counting)
- **Rollover accounts**: Included with full balance (no additional admin fee)
- **Standalone accounts**: Included with regular admin fee deduction

---

## Server Actions Architecture

### Why Server Actions?

- **No API overhead**: Direct server-side execution
- **Type safety**: Full TypeScript support throughout
- **Simplified architecture**: Fewer layers, easier debugging
- **Better performance**: No serialization/deserialization

### Core Server Action

```typescript
// src/features/investor/actions/get-investor-summary.ts
export async function getInvestorSummary(
  investorEmail: string
): Promise<InvestorSummary | null>;
```

### Data Flow

```
Client Component → Server Action → Database → Calculation Logic → Response
```

### Key Benefits

- Direct database queries with Drizzle ORM
- Server-side validation and error handling
- Comprehensive logging for debugging
- Automatic rollover filtering logic

---

## Logging and Debugging

### Comprehensive Logging System

#### Server Action Logs

```
================================================================================
INVESTOR NET FUND CALCULATION - START
================================================================================
Requested investor email: rafie@test.com
Admin fee percentage: 0.05

Database query results: 2 accounts found
Raw data from database: [detailed JSON]

ROLLOVER ANALYSIS:
--------------------------------------------------
Parent account IDs with rollovers: [1]
⏭️  Excluding parent account RAFIE-FIX-001 (has rollover children)
✅ Including account RAFIE-ROLLOVER-001-FIXED (rollover)

PROCESSING EACH ACTIVE INVESTMENT:
--------------------------------------------------
Investment 1: RAFIE-ROLLOVER-001-FIXED
  💰 ROLLOVER CALCULATION (NO ADMIN FEE):
    - Admin fee: 0
    - Net capital: 1114898428.33

FINAL INVESTOR SUMMARY (ROLLOVER-FILTERED):
================================================================================
Total Net Invested Fund: 1,114,898,428.33
NOTE: Parent accounts with rollovers have been excluded to avoid double counting.
```

#### Component Logs

```
🔍 InvestorNetFundDisplay - fetchNetFund called
📧 Email input: rafie@test.com
📞 Calling getInvestorSummary with email: rafie@test.com
✅ Successfully received investor data:
  - Total Net Fund: 1114898428.33
🎯 Component state updated with net fund: 1114898428.33
💰 Formatting currency: 1114898428.33 → Rp1.114.898.428,33
```

### Debug UI Components

- **Debug Information Panel**: Shows breakdown of calculations
- **Investment Details Expandable**: Full JSON view of investment data
- **Console Instructions**: Guides developers to browser console

---

## API Reference

### Server Actions

#### `getInvestorSummary(email: string)`

Returns complete investor portfolio summary.

**Parameters:**

- `email` (string): Investor email address

**Returns:**

```typescript
interface InvestorSummary {
  email: string;
  totalNetInvestedFund: number;
  totalGrossInvestedFund: number;
  totalAdminFees: number;
  activeInvestments: number;
  investments: InvestmentDetail[];
}
```

#### `getAllInvestorEmails()`

Returns list of all active investor emails (admin helper function).

**Returns:** `string[]`

### UI Components

#### `InvestorNetFundDisplay`

Focused component for displaying total net invested fund.

**Props:**

```typescript
interface InvestorNetFundDisplayProps {
  initialEmail?: string;
}
```

**Features:**

- Email input with validation
- Real-time net fund calculation
- Debug information panel
- Error handling with user feedback

### Pages

#### `/investor/summary`

Complete investor portfolio dashboard with:

- Key metrics overview
- Investment details table
- Rollover indicators
- Admin fee breakdown

#### `/investor/net-fund`

Simplified page focused on total net fund display with:

- Pre-filled test email (rafie@test.com)
- Debug instructions
- Console logging guidance

---

## Business Logic

### Admin Fee Calculation

#### Regular Investment

```typescript
if (!isRollover || adminFeeApplied) {
  adminFee = grossCapital * ADMIN_FEE_PERCENTAGE; // 5%
  netCapital = grossCapital - adminFee;
}
```

#### Rollover Investment

```typescript
if (isRollover && !adminFeeApplied) {
  adminFee = 0; // No additional admin fee
  netCapital = grossCapital; // Full amount works for investor
}
```

### Rollover Filtering Logic

```typescript
// Find parent accounts that have rollover children
const parentAccountIds = new Set(
  results
    .filter((r) => r.isRollover && r.parentAccountId)
    .map((r) => r.parentAccountId)
);

// Filter out parent accounts to avoid double counting
const activeAccounts = results.filter(
  (result) => !parentAccountIds.has(result.id)
);
```

### Constants

```typescript
// src/lib/utils/investment-calculator.ts
export const ADMIN_FEE_PERCENTAGE = 0.05; // 5%
```

---

## Example Data

### Rafie's Investment Portfolio

| Account                  | Type        | Gross Capital       | Admin Fee      | Net Capital         | Status                  |
| ------------------------ | ----------- | ------------------- | -------------- | ------------------- | ----------------------- |
| RAFIE-FIX-001            | Original    | Rp 1,000,000,000    | Rp 50,000,000  | Rp 950,000,000      | Excluded (has rollover) |
| RAFIE-ROLLOVER-001-FIXED | Rollover #1 | Rp 1,114,898,428.33 | Rp 0           | Rp 1,114,898,428.33 | ✅ Active               |
| RAFIE-2B-001             | Original    | Rp 2,000,000,000    | Rp 100,000,000 | Rp 1,900,000,000    | ✅ Active               |

**Total Net Fund:** Rp 3,014,898,428.33 (only active accounts)

---

## Testing

### Expected Results

For Rafie with rollover:

- Should see only 2 active investments (rollover + 2B investment)
- Original RAFIE-FIX-001 should be excluded from totals
- No double admin fees should be applied

---

## File Structure

```
src/
├── features/investor/
│   ├── actions/
│   │   └── get-investor-summary.ts     # Main server action
│   └── components/
│       └── InvestorNetFundDisplay.tsx  # Net fund component
├── app/
│   └── investor/
│       ├── summary/page.tsx            # Full portfolio page
│       └── net-fund/page.tsx           # Simple net fund page
└── db/postgres/
    ├── add_rollover_fields.sql         # Schema migration
    ├── delete_old_rollover.sql         # Cleanup script
    └── rafie_rollover_investment_fixed.sql # Corrected rollover
```

---

## Future Enhancements

### Potential Features

1. **Bulk Rollover Creation**: Create multiple rollovers at once
2. **Investment Performance Tracking**: Show returns over time
3. **Rollover Notifications**: Alert when investments are ready for rollover
4. **Admin Dashboard**: Manage all investor rollovers from one place
5. **Export Functionality**: PDF/Excel reports for investors

### Technical Improvements

1. **Caching**: Add Redis for frequently accessed investor data
2. **Real-time Updates**: WebSocket connections for live portfolio updates
3. **Background Jobs**: Automated rollover processing
4. **Audit Logging**: Track all investment modifications
5. **Multi-tenant Support**: Support multiple VC firms

---

## Troubleshooting

### Common Issues

#### "Investor not found"

- Verify email exists in users table
- Check account status is 'active'
- Ensure proper join conditions

#### "Double counting in totals"

- Check rollover filtering logic
- Verify parent_account_id relationships
- Review is_rollover flags

#### "Missing admin fee data"

- Ensure admin_fee_applied field is properly set
- Check default values in schema migration
- Verify rollover account creation scripts

### Debug Commands

```sql
-- Check rollover relationships
SELECT
  a.account_number,
  a.is_rollover,
  a.admin_fee_applied,
  a.rollover_sequence,
  parent.account_number as parent_account
FROM accounts a
LEFT JOIN accounts parent ON a.parent_account_id = parent.id
WHERE a.user_id = (SELECT id FROM users WHERE email = 'rafie@test.com');

-- Verify admin fee calculations
SELECT
  account_number,
  capital,
  is_rollover,
  admin_fee_applied,
  CASE
    WHEN is_rollover = true AND admin_fee_applied = false THEN 0
    ELSE capital * 0.05
  END as calculated_admin_fee
FROM accounts
WHERE user_id = (SELECT id FROM users WHERE email = 'rafie@test.com');
```

---

## Contributing

### Code Style

- Use TypeScript for all new code
- Add comprehensive logging for business logic
- Include JSDoc comments for public functions
- Follow existing naming conventions

### Database Changes

- Always create migration scripts
- Include rollback procedures
- Add proper constraints and indexes
- Update Drizzle schema definitions

### Testing

- Test rollover scenarios thoroughly
- Verify admin fee calculations
- Check edge cases (missing data, null values)
- Include both positive and negative test cases
