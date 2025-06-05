-- Test Investment Account for Rafie
-- Capital: Rp 1,000,000,000 (full amount stored, admin fee applied in backend)
-- Admin Fee (5%): Applied at calculation time
-- Period: April 19, 2024 to April 19, 2025
-- Annual Rate: 17%

-- 1. Insert user
INSERT INTO users (email, created_at) 
VALUES ('rafie@test.com', CURRENT_TIMESTAMP);

-- 2. Insert account type (if not exists)
INSERT INTO account_types (name, description, created_at, updated_at) 
SELECT 'fix', 'Fixed rate investment account', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM account_types WHERE name = 'fix');

-- 3. Insert the investment account
-- Note: Storing full capital amount, admin fee will be applied in backend calculations
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
    'RAFIE-FIX-001',
    1000000000.00, -- Full investment amount (admin fee applied in backend)
    '2024-04-19 00:00:00',
    '2025-04-19 00:00:00',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 4. Insert fix rate account details
INSERT INTO fix_rate_accounts (
    account_id,
    annual_rate,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-FIX-001'),
    0.17, -- 17% annual rate
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 5. Insert mutation record for the initial investment
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
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-FIX-001'),
    'inbound',
    1000000000.00, -- Full investment amount
    'Initial investment - Capital: Rp 1,000,000,000 (Admin fee of 5% applied at calculation time)',
    'completed',
    '2024-04-19 00:00:00',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Verification queries
SELECT 'Investment Account Created:' as status;
SELECT 
    u.email,
    a.account_number,
    a.capital as full_capital,
    a.transaction_date,
    a.end_date,
    fra.annual_rate,
    a.status
FROM accounts a
JOIN users u ON a.user_id = u.id
JOIN fix_rate_accounts fra ON a.id = fra.account_id
WHERE a.account_number = 'RAFIE-FIX-001'; 