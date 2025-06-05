-- Create tables for the investment platform

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

-- Role assignments table
CREATE TABLE role_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    role_id INTEGER REFERENCES roles(id)
);

-- Account types table
CREATE TABLE account_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- fix, floating, installment
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    account_type_id INTEGER REFERENCES account_types(id),
    account_number VARCHAR(255) UNIQUE NOT NULL,
    capital DECIMAL(20,2) NOT NULL, -- Initial investment amount
    transaction_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(50) NOT NULL, -- active, closed, suspended
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fix rate accounts table
CREATE TABLE fix_rate_accounts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    annual_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.17 for 17%
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Floating rate accounts table
CREATE TABLE floating_rate_accounts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    hurdle_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.10 for 10%
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Installment accounts table
CREATE TABLE installment_accounts (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    period_months INTEGER NOT NULL,
    monthly_rate DECIMAL(5,4) NOT NULL, -- e.g., 0.02 for 2%
    monthly_principle DECIMAL(20,2) NOT NULL,
    monthly_cof DECIMAL(20,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- VC Performance table
CREATE TABLE vc_performance (
    id SERIAL PRIMARY KEY,
    date TIMESTAMP NOT NULL, -- First day of the month
    aum DECIMAL(20,2) NOT NULL, -- Assets Under Management
    gross_profit DECIMAL(20,2) NOT NULL,
    roi_percentage DECIMAL(5,2) NOT NULL,
    cof_fix_rate DECIMAL(5,4) NOT NULL, -- Cost of Fund for Fix Rate accounts
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_monthly_performance UNIQUE (date)
);

-- Floating rate calculations table
CREATE TABLE floating_rate_calculations (
    id SERIAL PRIMARY KEY,
    floating_rate_account_id INTEGER REFERENCES floating_rate_accounts(id),
    vc_performance_id INTEGER REFERENCES vc_performance(id),
    gross_profit_for_floating DECIMAL(20,2) NOT NULL, -- Gross Profit - CoF Fix Rate
    performance_percentage DECIMAL(5,2) NOT NULL, -- Calculated as (gross_profit_for_floating / total_floating_capital) * 100
    calculated_rate DECIMAL(5,4) NOT NULL, -- Calculated based on performance_percentage and hurdle_rate
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Mutations table
CREATE TABLE mutations (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES accounts(id),
    type VARCHAR(50) NOT NULL, -- inbound, outbound
    amount DECIMAL(20,2) NOT NULL,
    description TEXT, -- e.g., "New investment", "Withdrawal", "Interest payment"
    status VARCHAR(50) NOT NULL, -- pending, completed, failed
    transaction_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index for mutations table
CREATE INDEX idx_mutations_account_transaction 
ON mutations(account_id, transaction_date);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_account_types_updated_at
    BEFORE UPDATE ON account_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fix_rate_accounts_updated_at
    BEFORE UPDATE ON fix_rate_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floating_rate_accounts_updated_at
    BEFORE UPDATE ON floating_rate_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_accounts_updated_at
    BEFORE UPDATE ON installment_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vc_performance_updated_at
    BEFORE UPDATE ON vc_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_floating_rate_calculations_updated_at
    BEFORE UPDATE ON floating_rate_calculations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mutations_updated_at
    BEFORE UPDATE ON mutations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 