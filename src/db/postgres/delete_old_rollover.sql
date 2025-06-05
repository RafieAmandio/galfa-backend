-- Delete the old/incorrect rollover account: RAFIE-ROLLOVER-001
-- This account was incorrectly applying admin fees to rollover investments
-- We'll keep the corrected version: RAFIE-ROLLOVER-001-FIXED

-- Show what we're about to delete (for verification)
SELECT 'Old rollover account to be deleted:' as info;
SELECT 
    a.account_number,
    a.capital,
    a.is_rollover,
    a.admin_fee_applied,
    a.transaction_date,
    a.end_date
FROM accounts a
WHERE a.account_number = 'RAFIE-ROLLOVER-001';

-- Step 1: Delete mutation records first (due to foreign key constraints)
DELETE FROM mutations 
WHERE account_id = (SELECT id FROM accounts WHERE account_number = 'RAFIE-ROLLOVER-001');

-- Step 2: Delete fix rate account record
DELETE FROM fix_rate_accounts 
WHERE account_id = (SELECT id FROM accounts WHERE account_number = 'RAFIE-ROLLOVER-001');

-- Step 3: Delete the main account record
DELETE FROM accounts 
WHERE account_number = 'RAFIE-ROLLOVER-001';

-- Verification queries
SELECT 'Old rollover account deletion completed' as status;

-- Verify the old account is gone
SELECT 
    COUNT(*) as old_rollover_records_remaining,
    'Should be 0' as expected
FROM accounts 
WHERE account_number = 'RAFIE-ROLLOVER-001';

-- Show remaining Rafie accounts (should only show corrected ones)
SELECT 
    'Remaining Rafie accounts after cleanup:' as info;
    
SELECT 
    a.account_number,
    a.capital as starting_capital,
    a.transaction_date as start_date,
    a.end_date,
    a.is_rollover,
    a.admin_fee_applied,
    a.rollover_sequence,
    CASE 
        WHEN a.account_number = 'RAFIE-FIX-001' THEN 'Year 1 (Original)'
        WHEN a.account_number = 'RAFIE-ROLLOVER-001-FIXED' THEN 'Year 2 (Corrected Rollover)'
        WHEN a.account_number = 'RAFIE-2B-001' THEN 'New 2B Investment'
        ELSE 'Other'
    END as investment_description
FROM accounts a
JOIN users u ON a.user_id = u.id
WHERE u.email = 'rafie@test.com'
ORDER BY a.transaction_date; 