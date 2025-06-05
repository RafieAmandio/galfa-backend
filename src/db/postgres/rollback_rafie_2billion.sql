-- Rollback script for Rafie's 2 Billion Investment
-- This will remove the RAFIE-2B-001 account and all related records

-- Delete mutation record first (due to foreign key constraints)
DELETE FROM mutations 
WHERE account_id = (SELECT id FROM accounts WHERE account_number = 'RAFIE-2B-001');

-- Delete fix rate account record
DELETE FROM fix_rate_accounts 
WHERE account_id = (SELECT id FROM accounts WHERE account_number = 'RAFIE-2B-001');

-- Delete the main account record
DELETE FROM accounts 
WHERE account_number = 'RAFIE-2B-001';

-- Verification query
SELECT 'Rollback completed - RAFIE-2B-001 removed' as status;

-- Verify no records remain
SELECT COUNT(*) as remaining_rafie_2b_records 
FROM accounts 
WHERE account_number = 'RAFIE-2B-001'; 