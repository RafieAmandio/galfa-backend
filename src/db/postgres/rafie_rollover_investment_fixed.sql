-- Rafie's CORRECTED Rollover Investment Account
-- This properly extends the original investment without double admin fees
-- Starts: April 19, 2025 (where previous investment ends)
-- Ends: April 19, 2026 (1 year extension)
-- Capital: Final balance from previous investment (NO additional admin fee)
-- Annual Rate: 17%

-- First, apply the schema changes if not already done
-- (This should be run separately: src/db/postgres/add_rollover_fields.sql)

-- Calculate the final balance from the original investment
-- This will be used as the starting capital for rollover (no admin fee deduction)
-- Expected final balance: ~1,114,898,428.33 (based on compound calculations)

-- Insert the corrected rollover investment account
INSERT INTO accounts (
    user_id, 
    account_type_id, 
    account_number, 
    capital, 
    transaction_date, 
    end_date, 
    status,
    is_rollover,
    parent_account_id,
    admin_fee_applied,
    rollover_sequence,
    created_at, 
    updated_at
) VALUES (
    (SELECT id FROM users WHERE email = 'rafie@test.com'),
    (SELECT id FROM account_types WHERE name = 'fix'),
    'RAFIE-ROLLOVER-001-FIXED',
    1114898428.33, -- Final balance from original investment (NO admin fee deduction)
    '2025-04-19 00:00:00',
    '2026-04-19 00:00:00',
    'active',
    TRUE, -- This is a rollover
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-FIX-001'), -- Parent account
    FALSE, -- NO admin fee applied for rollover
    1, -- First rollover (sequence 1)
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert fix rate account details for the corrected rollover
INSERT INTO fix_rate_accounts (
    account_id,
    annual_rate,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-ROLLOVER-001-FIXED'),
    0.17, -- Same 17% annual rate
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Insert mutation record for the rollover (representing the extension/continuation)
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
    (SELECT id FROM accounts WHERE account_number = 'RAFIE-ROLLOVER-001-FIXED'),
    'inbound',
    1114898428.33, -- Full final balance carried forward
    'Rollover extension from RAFIE-FIX-001 - Year 2 continuation (NO additional admin fee)',
    'completed',
    '2025-04-19 00:00:00',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Verification queries
SELECT 'Corrected Rollover Investment Account Created:' as status;

-- Show the corrected rollover account details
SELECT 
    u.email,
    a.account_number,
    a.capital as starting_capital,
    a.transaction_date,
    a.end_date,
    a.is_rollover,
    a.admin_fee_applied,
    a.rollover_sequence,
    fra.annual_rate,
    a.status,
    'Year 2 Rollover (NO Additional Admin Fee)' as investment_type
FROM accounts a
JOIN users u ON a.user_id = u.id
JOIN fix_rate_accounts fra ON a.id = fra.account_id
WHERE a.account_number = 'RAFIE-ROLLOVER-001-FIXED';

-- Show parent-child relationship
SELECT 
    'Parent-Child Rollover Relationship:' as relationship_info;
    
SELECT 
    parent.account_number as parent_account,
    parent.capital as parent_capital,
    parent.end_date as parent_end_date,
    child.account_number as rollover_account,
    child.capital as rollover_starting_capital,
    child.transaction_date as rollover_start_date,
    child.admin_fee_applied as rollover_admin_fee_applied
FROM accounts parent
JOIN accounts child ON parent.id = child.parent_account_id
WHERE parent.account_number = 'RAFIE-FIX-001'
AND child.account_number = 'RAFIE-ROLLOVER-001-FIXED';

-- Show all of Rafie's investments including the corrected rollover
SELECT 
    a.account_number,
    a.capital as starting_capital,
    a.transaction_date as start_date,
    a.end_date,
    a.is_rollover,
    a.admin_fee_applied,
    a.rollover_sequence,
    fra.annual_rate,
    CASE 
        WHEN a.account_number = 'RAFIE-FIX-001' THEN 'Year 1 (Original - with admin fee)'
        WHEN a.account_number = 'RAFIE-ROLLOVER-001-FIXED' THEN 'Year 2 (Rollover - NO admin fee)'
        WHEN a.account_number = 'RAFIE-2B-001' THEN 'New 2B Investment'
        ELSE 'Other'
    END as investment_description
FROM accounts a
JOIN users u ON a.user_id = u.id
JOIN fix_rate_accounts fra ON a.id = fra.account_id
WHERE u.email = 'rafie@test.com'
ORDER BY a.transaction_date;

-- Calculate expected returns comparison
SELECT 
    'Investment Comparison:' as comparison,
    '--- Original Investment ---' as separator1,
    1000000000.00 as original_gross_capital,
    1000000000.00 * 0.05 as original_admin_fee,
    1000000000.00 * 0.95 as original_net_capital,
    '--- Rollover Investment ---' as separator2,
    1114898428.33 as rollover_starting_capital,
    0.00 as rollover_admin_fee,
    1114898428.33 as rollover_net_capital,
    'The rollover starts with the full final balance from Year 1' as note; 