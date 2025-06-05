-- Rafie's 2 Billion Rupiahs Investment Account
-- Capital: Rp 2,000,000,000 (full amount stored, admin fee applied in backend)
-- Admin Fee (5%): Applied at calculation time
-- Period: March 15, 2025 to March 15, 2026
-- Annual Rate: 17%

-- Insert the 2 billion investment account
-- Starting March 15, 2025 and ending March 15, 2026
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
    'RAFIE-2B-001',
    2000000000.00, -- 2 billion rupiahs full investment amount
    '2025-03-15 00:00:00', -- Starting March 15, 2025
    '2026-03-15 00:00:00', -- Ending March 15, 2026 (1 year)
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert fix rate account details for the 2B investment
INSERT INTO fix_rate_accounts (
    account_id,
    annual_rate,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-2B-001'),
    0.17, -- Same 17% annual rate
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert mutation record for the 2 billion investment
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
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-2B-001'),
    'inbound',
    2000000000.00, -- Full 2 billion investment amount
    'New investment - Capital: Rp 2,000,000,000 (Admin fee of 5% applied at calculation time)',
    'completed',
    '2025-03-15 00:00:00',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Verification queries
SELECT 'New 2 Billion Investment Account Created:' as status;
SELECT 
    u.email,
    a.account_number,
    a.capital as full_capital,
    a.transaction_date,
    a.end_date,
    fra.annual_rate,
    a.status,
    'Rp 2 Billion Investment' as investment_type
FROM accounts a
JOIN users u ON a.user_id = u.id
JOIN fix_rate_accounts fra ON a.id = fra.account_id
WHERE a.account_number = 'RAFIE-2B-001';

-- Show all of Rafie's investments for comparison
SELECT 
    a.account_number,
    a.capital as gross_capital,
    a.transaction_date as start_date,
    a.end_date,
    fra.annual_rate,
    CASE 
        WHEN a.account_number = 'RAFIE-FIX-001' THEN 'Year 1 (1B Original)'
        WHEN a.account_number = 'RAFIE-ROLLOVER-001' THEN 'Year 2 (Rollover)'
        WHEN a.account_number = 'RAFIE-2B-001' THEN 'New 2B Investment'
        ELSE 'Other'
    END as investment_description
FROM accounts a
JOIN users u ON a.user_id = u.id
JOIN fix_rate_accounts fra ON a.id = fra.account_id
WHERE u.email = 'rafie@test.com'
ORDER BY a.transaction_date;

-- Calculate expected returns for the 2B investment
SELECT 
    'Expected Investment Summary for RAFIE-2B-001:' as calculation,
    2000000000.00 as gross_capital,
    2000000000.00 * 0.05 as admin_fee_5_percent,
    2000000000.00 * 0.95 as net_capital,
    (2000000000.00 * 0.95) * 0.17 as annual_interest_on_net,
    (2000000000.00 * 0.95) * 1.17 as expected_final_balance_simple,
    'Note: Actual compound calculation will be done in the application' as note; 