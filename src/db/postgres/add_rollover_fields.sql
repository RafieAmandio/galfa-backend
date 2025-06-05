-- Add rollover functionality to accounts table
-- This enables proper tracking of rollover investments

-- Add new columns to accounts table
ALTER TABLE accounts 
ADD COLUMN is_rollover BOOLEAN DEFAULT FALSE,
ADD COLUMN parent_account_id INTEGER REFERENCES accounts(id),
ADD COLUMN admin_fee_applied BOOLEAN DEFAULT TRUE,
ADD COLUMN rollover_sequence INTEGER DEFAULT 0; -- 0 = original, 1 = first rollover, etc.

-- Add index for parent account lookups
CREATE INDEX idx_accounts_parent_account ON accounts(parent_account_id);

-- Add index for rollover accounts
CREATE INDEX idx_accounts_rollover ON accounts(is_rollover, parent_account_id);

-- Add constraint to ensure rollover accounts have parent
ALTER TABLE accounts 
ADD CONSTRAINT chk_rollover_has_parent 
CHECK (
    (is_rollover = FALSE AND parent_account_id IS NULL) OR 
    (is_rollover = TRUE AND parent_account_id IS NOT NULL)
);

-- Update existing accounts to have admin_fee_applied = TRUE and is_rollover = FALSE
UPDATE accounts 
SET 
    admin_fee_applied = TRUE,
    is_rollover = FALSE,
    rollover_sequence = 0
WHERE admin_fee_applied IS NULL OR is_rollover IS NULL;

-- Comments for documentation
COMMENT ON COLUMN accounts.is_rollover IS 'TRUE if this account is a rollover from another account';
COMMENT ON COLUMN accounts.parent_account_id IS 'Reference to the original account this rollover extends';
COMMENT ON COLUMN accounts.admin_fee_applied IS 'FALSE for rollover accounts (no additional admin fee)';
COMMENT ON COLUMN accounts.rollover_sequence IS 'Sequence number: 0=original, 1=first rollover, 2=second rollover, etc.';

-- Verification queries
SELECT 'Rollover fields added successfully' as status;

-- Show current account structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'accounts' 
AND column_name IN ('is_rollover', 'parent_account_id', 'admin_fee_applied', 'rollover_sequence')
ORDER BY ordinal_position; 