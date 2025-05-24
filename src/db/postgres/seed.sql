-- First, ensure we have the account types
INSERT INTO account_types (name, description) VALUES
    ('fix', 'Fixed rate investment account with predetermined interest rate'),
    ('floating', 'Variable rate investment account based on VC performance'),
    ('installment', 'Monthly installment investment account');

-- Create test users
INSERT INTO users (email) VALUES
    ('adit@example.com'),
    ('jarwo@example.com');

-- Create accounts for Adit and Jarwo (Fix Rate)
INSERT INTO accounts (
    user_id,
    account_type_id,
    account_number,
    capital,
    transaction_date,
    end_date,
    status
) VALUES
    -- Adit's Fix Rate Account
    (
        (SELECT id FROM users WHERE email = 'adit@example.com'),
        (SELECT id FROM account_types WHERE name = 'fix'),
        'FIX-001',
        12000000,
        '2025-04-18',
        '2026-04-18',
        'active'
    ),
    -- Jarwo's Fix Rate Account
    (
        (SELECT id FROM users WHERE email = 'jarwo@example.com'),
        (SELECT id FROM account_types WHERE name = 'fix'),
        'FIX-002',
        15000000,
        '2025-04-23',
        '2026-04-23',
        'active'
    );

-- Create fix rate account details
INSERT INTO fix_rate_accounts (
    account_id,
    annual_rate,
    monthly_rate,
    interest_calculation_method
) VALUES
    (
        (SELECT id FROM accounts WHERE account_number = 'FIX-001'),
        0.17,
        0.0142,
        'flat'
    ),
    (
        (SELECT id FROM accounts WHERE account_number = 'FIX-002'),
        0.12,
        0.01,
        'flat'
    );

-- Create Floating Rate accounts
INSERT INTO accounts (
    user_id,
    account_type_id,
    account_number,
    capital,
    transaction_date,
    end_date,
    status
) VALUES
    -- Adit's Floating Rate Account
    (
        (SELECT id FROM users WHERE email = 'adit@example.com'),
        (SELECT id FROM account_types WHERE name = 'floating'),
        'FLT-001',
        10000000,
        '2025-02-02',
        '2026-02-02',
        'active'
    ),
    -- Jarwo's Floating Rate Account
    (
        (SELECT id FROM users WHERE email = 'jarwo@example.com'),
        (SELECT id FROM account_types WHERE name = 'floating'),
        'FLT-002',
        7500000,
        '2025-02-02',
        '2026-02-02',
        'active'
    );

-- Create floating rate account details
INSERT INTO floating_rate_accounts (
    account_id,
    hurdle_rate
) VALUES
    (
        (SELECT id FROM accounts WHERE account_number = 'FLT-001'),
        0.10
    ),
    (
        (SELECT id FROM accounts WHERE account_number = 'FLT-002'),
        0.10
    );

-- Create Installment accounts
INSERT INTO accounts (
    user_id,
    account_type_id,
    account_number,
    capital,
    transaction_date,
    end_date,
    status
) VALUES
    -- Adit's Installment Account
    (
        (SELECT id FROM users WHERE email = 'adit@example.com'),
        (SELECT id FROM account_types WHERE name = 'installment'),
        'INS-001',
        50000000,
        '2025-01-05',
        '2025-05-05',
        'active'
    ),
    -- Jarwo's Installment Account
    (
        (SELECT id FROM users WHERE email = 'jarwo@example.com'),
        (SELECT id FROM account_types WHERE name = 'installment'),
        'INS-002',
        10000000,
        '2025-01-03',
        '2025-07-03',
        'active'
    );

-- Create installment account details
INSERT INTO installment_accounts (
    account_id,
    period_months,
    monthly_rate,
    monthly_principle,
    monthly_cof
) VALUES
    (
        (SELECT id FROM accounts WHERE account_number = 'INS-001'),
        4,
        0.02,
        12500000,
        1000000
    ),
    (
        (SELECT id FROM accounts WHERE account_number = 'INS-002'),
        6,
        0.02,
        1666667,
        200000
    );

-- Insert VC Performance data
INSERT INTO vc_performance (
    date,
    aum,
    gross_profit,
    roi_percentage,
    cof_fix_rate
) VALUES
    ('2025-01-01', 75000000, 8900000, 11.87, 0.17),
    ('2025-02-01', 85000000, 10000000, 11.76, 0.17),
    ('2025-03-01', 120000000, 20000000, 16.67, 0.17);

-- Insert some example mutations for the fix rate accounts
INSERT INTO mutations (
    account_id,
    type,
    amount,
    description,
    status,
    transaction_date
) VALUES
    (
        (SELECT id FROM accounts WHERE account_number = 'FIX-001'),
        'inbound',
        12000000,
        'Initial investment - Fix Rate Account',
        'completed',
        '2025-04-18'
    ),
    (
        (SELECT id FROM accounts WHERE account_number = 'FIX-002'),
        'inbound',
        15000000,
        'Initial investment - Fix Rate Account',
        'completed',
        '2025-04-23'
    );

-- Insert example mutations for floating rate accounts
INSERT INTO mutations (
    account_id,
    type,
    amount,
    description,
    status,
    transaction_date
) VALUES
    (
        (SELECT id FROM accounts WHERE account_number = 'FLT-001'),
        'inbound',
        10000000,
        'Initial investment - Floating Rate Account',
        'completed',
        '2025-02-02'
    ),
    (
        (SELECT id FROM accounts WHERE account_number = 'FLT-002'),
        'inbound',
        7500000,
        'Initial investment - Floating Rate Account',
        'completed',
        '2025-02-02'
    );

-- Insert example mutations for installment accounts
INSERT INTO mutations (
    account_id,
    type,
    amount,
    description,
    status,
    transaction_date
) VALUES
    (
        (SELECT id FROM accounts WHERE account_number = 'INS-001'),
        'inbound',
        50000000,
        'Initial investment - Installment Account',
        'completed',
        '2025-01-05'
    ),
    (
        (SELECT id FROM accounts WHERE account_number = 'INS-002'),
        'inbound',
        10000000,
        'Initial investment - Installment Account',
        'completed',
        '2025-01-03'
    ); 