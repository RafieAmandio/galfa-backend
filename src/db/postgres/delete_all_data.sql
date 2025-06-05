-- Delete all existing data from Galfa Capital investment platform
-- This script deletes all rows from all tables in the correct order to handle foreign key constraints

-- Disable foreign key checks temporarily (PostgreSQL specific)
-- SET session_replication_role = replica;

-- Delete data in reverse dependency order to avoid foreign key constraint violations

-- 1. Delete from tables with no dependencies first
DELETE FROM floating_rate_calculations;
DELETE FROM mutations;

-- 2. Delete from account-specific tables
DELETE FROM fix_rate_accounts;
DELETE FROM floating_rate_accounts;
DELETE FROM installment_accounts;

-- 3. Delete from VC performance (referenced by floating_rate_calculations)
DELETE FROM vc_performance;

-- 4. Delete from accounts (referenced by account-specific tables and mutations)
DELETE FROM accounts;

-- 5. Delete from role assignments (junction table)
DELETE FROM role_assignments;

-- 6. Delete from account types (referenced by accounts)
DELETE FROM account_types;

-- 7. Delete from roles (referenced by role_assignments)
DELETE FROM roles;

-- 8. Delete from users (referenced by accounts and role_assignments)
DELETE FROM users;

-- Re-enable foreign key checks
-- SET session_replication_role = DEFAULT;

-- Reset auto-increment sequences to start from 1
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE roles_id_seq RESTART WITH 1;
ALTER SEQUENCE role_assignments_id_seq RESTART WITH 1;
ALTER SEQUENCE account_types_id_seq RESTART WITH 1;
ALTER SEQUENCE accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE fix_rate_accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE floating_rate_accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE installment_accounts_id_seq RESTART WITH 1;
ALTER SEQUENCE vc_performance_id_seq RESTART WITH 1;
ALTER SEQUENCE floating_rate_calculations_id_seq RESTART WITH 1;
ALTER SEQUENCE mutations_id_seq RESTART WITH 1;

-- Optional: Verify all tables are empty
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'roles', COUNT(*) FROM roles
UNION ALL
SELECT 'role_assignments', COUNT(*) FROM role_assignments
UNION ALL
SELECT 'account_types', COUNT(*) FROM account_types
UNION ALL
SELECT 'accounts', COUNT(*) FROM accounts
UNION ALL
SELECT 'fix_rate_accounts', COUNT(*) FROM fix_rate_accounts
UNION ALL
SELECT 'floating_rate_accounts', COUNT(*) FROM floating_rate_accounts
UNION ALL
SELECT 'installment_accounts', COUNT(*) FROM installment_accounts
UNION ALL
SELECT 'vc_performance', COUNT(*) FROM vc_performance
UNION ALL
SELECT 'floating_rate_calculations', COUNT(*) FROM floating_rate_calculations
UNION ALL
SELECT 'mutations', COUNT(*) FROM mutations; 