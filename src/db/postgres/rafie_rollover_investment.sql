-- Rafie's Rollover Investment Account
-- Starts: April 19, 2025 (where previous investment ends)
-- Ends: April 19, 2026 (1 year extension)
-- Capital: Based on final balance from previous investment
-- Admin Fee: 5% applied in backend
-- Annual Rate: 17%

-- Calculate the rollover capital (using expected final amount from first investment)
-- Expected final amount from first investment: ~1,111,500,000
-- This becomes the gross capital for the rollover

-- Insert the rollover investment account
INSERT INTO accounts (
    user_id, 
    account_type_id, 
    account_number, 
    capital, 
    transaction_date, 
    end_date, 
    status, 
    created_at, 
    updated_at
) VALUES (
    (SELECT id FROM users WHERE email = 'rafie@test.com'),
    (SELECT id FROM account_types WHERE name = 'fix'),
    'RAFIE-ROLLOVER-001',
    1111500000.00, -- Final amount from previous investment becomes new gross capital
    '2025-04-19 00:00:00',
    '2026-04-19 00:00:00',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert fix rate account details for rollover
INSERT INTO fix_rate_accounts (
    account_id,
    annual_rate,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-ROLLOVER-001'),
    0.17, -- Same 17% annual rate
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert mutation record for the rollover investment
INSERT INTO mutations (
    account_id,
    type,
    amount,
    description,
    status,
    transaction_date,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-ROLLOVER-001'),
    'inbound',
    1113926389.91, -- Full rollover amount based on the final balance from the previous investment
    'Rollover investment from RAFIE-FIX-001 - Year 2 extension (Admin fee of 5% applied at calculation time)',
    'completed',
    '2025-04-19 00:00:00',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Verification queries
SELECT 'Rollover Investment Account Created:' as status;
SELECT 
    u.email,
    a.account_number,
    a.capital as gross_capital,
    a.transaction_date,
    a.end_date,
    fra.annual_rate,
    a.status,
    'Year 2 Rollover' as investment_type
FROM accounts a
JOIN users u ON a.user_id = u.id
JOIN fix_rate_accounts fra ON a.id = fra.account_id
WHERE a.account_number = 'RAFIE-ROLLOVER-001';

-- Show both investments for comparison
SELECT 
    a.account_number,
    a.capital as gross_capital,
    a.transaction_date as start_date,
    a.end_date,
    fra.annual_rate,
    CASE 
        WHEN a.account_number = 'RAFIE-FIX-001' THEN 'Year 1 (Original)'
        WHEN a.account_number = 'RAFIE-ROLLOVER-001' THEN 'Year 2 (Rollover)'
        ELSE 'Other'
    END as investment_period
FROM accounts a
JOIN users u ON a.user_id = u.id
JOIN fix_rate_accounts fra ON a.id = fra.account_id
WHERE u.email = 'rafie@test.com'
ORDER BY a.transaction_date; 