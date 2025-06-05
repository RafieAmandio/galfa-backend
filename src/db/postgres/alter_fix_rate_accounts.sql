-- Update fix_rate_accounts table to match new schema
-- Remove monthly_rate and interest_calculation_method columns

-- First, let's see the current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fix_rate_accounts' 
ORDER BY ordinal_position;

-- Drop the columns we no longer need
ALTER TABLE fix_rate_accounts 
DROP COLUMN IF EXISTS monthly_rate;

ALTER TABLE fix_rate_accounts 
DROP COLUMN IF EXISTS interest_calculation_method;

-- Verify the updated structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fix_rate_accounts' 
ORDER BY ordinal_position;

-- Show current data (if any exists)
SELECT * FROM fix_rate_accounts; 