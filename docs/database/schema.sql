-- ===========================================================================
-- CHRONOS TIME TRACKING SYSTEM - PostgreSQL Schema
-- ===========================================================================
-- Multi-tenant SaaS time tracking system with company management
-- Version: 1.0
-- Created: November 2025
-- ===========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable timezone extension  
CREATE EXTENSION IF NOT EXISTS "timescaledb" CASCADE;

-- ===========================================================================
-- ENUMS
-- ===========================================================================

-- User roles in the system
CREATE TYPE user_role AS ENUM (
  'super_admin',     -- System administrator (no company)
  'company_admin',   -- Company administrator  
  'employee'         -- Regular employee
);

-- Employee status
CREATE TYPE employee_status AS ENUM (
  'active',
  'inactive'
);

-- Work session status
CREATE TYPE work_status AS ENUM (
  'clocked_out',
  'working',
  'on_break'
);

-- Timesheet entry status
CREATE TYPE timesheet_status AS ENUM (
  'complete',
  'incomplete', 
  'in_progress',
  'error'
);

-- Request status for all types of requests
CREATE TYPE request_status AS ENUM (
  'pending',
  'approved', 
  'rejected',
  'cancelled'
);

-- Types of absence requests
CREATE TYPE absence_type AS ENUM (
  'vacation',
  'personal_day',
  'sick_leave',
  'compensatory_time',
  'other'
);

-- Subscription plans
CREATE TYPE subscription_plan AS ENUM (
  'free',
  'starter', 
  'professional',
  'enterprise'
);

-- Invoice status
CREATE TYPE invoice_status AS ENUM (
  'draft',
  'pending',
  'paid',
  'overdue',
  'cancelled'
);

-- Audit action types
CREATE TYPE audit_action AS ENUM (
  'created',
  'updated', 
  'deleted',
  'login',
  'logout',
  'role_changed',
  'permission_granted',
  'permission_revoked'
);

-- ===========================================================================
-- MAIN TABLES
-- ===========================================================================

-- Companies table (multi-tenant)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  address TEXT,
  subscription_plan subscription_plan NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Users table (includes all user types)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NULL REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified_at TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,
  
  -- Constraints
  CONSTRAINT users_super_admin_no_company CHECK (
    (role = 'super_admin' AND company_id IS NULL) OR 
    (role != 'super_admin' AND company_id IS NOT NULL)
  )
);

-- Employee details (extends users for company employees)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_number VARCHAR(50),
  position VARCHAR(100),
  department VARCHAR(100),
  phone_number VARCHAR(50),
  hire_date DATE,
  status employee_status NOT NULL DEFAULT 'active',
  vacation_days_per_year INTEGER NOT NULL DEFAULT 22,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ NULL,
  deactivated_by UUID NULL REFERENCES users(id),
  
  -- Ensure user belongs to same company
  CONSTRAINT employees_same_company CHECK (company_id = (SELECT company_id FROM users WHERE id = user_id))
);

-- Company settings (tenant configuration)
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(company_id, setting_key)
);

-- ===========================================================================
-- TIME TRACKING TABLES
-- ===========================================================================

-- Work sessions (main time tracking table)
CREATE TABLE work_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ NULL,
  status work_status NOT NULL DEFAULT 'working',
  total_hours DECIMAL(5,2) NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT work_sessions_valid_times CHECK (clock_out IS NULL OR clock_out > clock_in),
  CONSTRAINT work_sessions_same_company CHECK (company_id = (SELECT company_id FROM users WHERE id = user_id))
);

-- Break periods within work sessions
CREATE TABLE breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_session_id UUID NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NULL,
  duration_minutes INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT breaks_valid_times CHECK (end_time IS NULL OR end_time > start_time)
);

-- ===========================================================================
-- REQUEST TABLES
-- ===========================================================================

-- Absence requests (vacations, sick leave, etc.)
CREATE TABLE absence_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type absence_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  year INTEGER NOT NULL, -- For vacation year tracking
  comments TEXT,
  status request_status NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL REFERENCES users(id),
  review_comments TEXT,
  
  -- Constraints
  CONSTRAINT absence_requests_valid_dates CHECK (end_date >= start_date),
  CONSTRAINT absence_requests_same_company CHECK (company_id = (SELECT company_id FROM users WHERE id = user_id))
);

-- Time correction requests (for fixing timesheet errors)
CREATE TABLE time_correction_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  work_session_id UUID NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  
  -- Original values (for audit trail)
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  
  -- Requested changes
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  
  reason TEXT NOT NULL,
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by UUID NULL REFERENCES users(id),
  review_notes TEXT,
  
  -- Constraints
  CONSTRAINT time_correction_same_company CHECK (company_id = (SELECT company_id FROM users WHERE id = user_id))
);

-- ===========================================================================
-- BILLING TABLES
-- ===========================================================================

-- Invoices for billing
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  status invoice_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ NULL
);

-- Invoice items (line items)
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================================
-- AUDIT TABLE
-- ===========================================================================

-- Audit log for tracking critical changes
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NULL REFERENCES users(id),
  company_id UUID NULL REFERENCES companies(id),
  entity_type VARCHAR(50) NOT NULL, -- table name
  entity_id UUID NOT NULL,          -- record id
  action audit_action NOT NULL,
  old_values JSONB NULL,
  new_values JSONB NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================================
-- PASSWORD RESET TOKENS
-- ===========================================================================

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===========================================================================
-- INDEXES FOR PERFORMANCE
-- ===========================================================================

-- Users indexes
CREATE INDEX idx_users_company_id ON users(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_company_role ON users(company_id, role) WHERE deleted_at IS NULL;

-- Employees indexes
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_company_id ON employees(company_id);
CREATE INDEX idx_employees_status ON employees(status);

-- Work sessions indexes (critical for time tracking performance)
CREATE INDEX idx_work_sessions_user_date ON work_sessions(user_id, date);
CREATE INDEX idx_work_sessions_company_date ON work_sessions(company_id, date);
CREATE INDEX idx_work_sessions_clock_in ON work_sessions(clock_in);
CREATE INDEX idx_work_sessions_status ON work_sessions(status);

-- Breaks indexes
CREATE INDEX idx_breaks_session_id ON breaks(work_session_id);
CREATE INDEX idx_breaks_start_time ON breaks(start_time);

-- Request indexes
CREATE INDEX idx_absence_requests_user_id ON absence_requests(user_id);
CREATE INDEX idx_absence_requests_company_status ON absence_requests(company_id, status);
CREATE INDEX idx_absence_requests_dates ON absence_requests(start_date, end_date);
CREATE INDEX idx_absence_requests_year ON absence_requests(year);

CREATE INDEX idx_time_correction_requests_user_id ON time_correction_requests(user_id);
CREATE INDEX idx_time_correction_requests_status ON time_correction_requests(status);

-- Billing indexes
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Audit indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_company_id ON audit_logs(company_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Company settings indexes
CREATE INDEX idx_company_settings_company_key ON company_settings(company_id, setting_key);

-- Password reset tokens indexes
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- ===========================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ===========================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables that need updated_at
CREATE TRIGGER trigger_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_work_sessions_updated_at BEFORE UPDATE ON work_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_company_settings_updated_at BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ===========================================================================

-- Function to calculate total hours for a work session
CREATE OR REPLACE FUNCTION calculate_work_session_hours(session_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    total_minutes INTEGER;
    break_minutes INTEGER;
    work_minutes INTEGER;
    clock_in_time TIMESTAMPTZ;
    clock_out_time TIMESTAMPTZ;
BEGIN
    -- Get session times
    SELECT clock_in, clock_out INTO clock_in_time, clock_out_time
    FROM work_sessions WHERE id = session_id;
    
    -- Return NULL if session not complete
    IF clock_out_time IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate total minutes
    total_minutes := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 60;
    
    -- Calculate break minutes
    SELECT COALESCE(SUM(duration_minutes), 0) INTO break_minutes
    FROM breaks 
    WHERE work_session_id = session_id AND duration_minutes IS NOT NULL;
    
    -- Calculate work minutes
    work_minutes := total_minutes - break_minutes;
    
    -- Return hours (rounded to 2 decimals)
    RETURN ROUND(work_minutes / 60.0, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to get vacation days used in a year
CREATE OR REPLACE FUNCTION get_vacation_days_used(employee_user_id UUID, vacation_year INTEGER)
RETURNS INTEGER AS $$
DECLARE
    days_used INTEGER;
BEGIN
    SELECT COALESCE(SUM(total_days), 0) INTO days_used
    FROM absence_requests
    WHERE user_id = employee_user_id 
      AND type = 'vacation'
      AND year = vacation_year
      AND status = 'approved';
      
    RETURN days_used;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- SAMPLE DATA CONFIGURATION
-- ===========================================================================

-- Insert default company settings
CREATE OR REPLACE FUNCTION setup_default_company_settings(comp_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO company_settings (company_id, setting_key, setting_value) VALUES
    (comp_id, 'working_hours', '{"daily": 8, "weekly": 40}'),
    (comp_id, 'vacation_policy', '{"default_days_per_year": 22, "max_consecutive_days": 15}'),
    (comp_id, 'break_policy', '{"min_break_duration": 15, "max_break_duration": 120}'),
    (comp_id, 'time_tracking', '{"auto_clock_out": false, "require_break_reason": false}')
    ON CONFLICT (company_id, setting_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- VIEWS FOR COMMON QUERIES
-- ===========================================================================

-- View for employee details with user info
CREATE VIEW employee_details AS
SELECT 
    e.id,
    e.user_id,
    e.company_id,
    u.email,
    u.first_name,
    u.last_name,
    e.employee_number,
    e.position,
    e.department,
    e.phone_number,
    e.hire_date,
    e.status,
    e.vacation_days_per_year,
    e.created_at,
    e.updated_at
FROM employees e
JOIN users u ON e.user_id = u.id
WHERE u.deleted_at IS NULL;

-- View for current work status
CREATE VIEW current_work_status AS
SELECT DISTINCT ON (user_id)
    user_id,
    id as session_id,
    date,
    clock_in,
    clock_out,
    status,
    total_hours
FROM work_sessions
ORDER BY user_id, clock_in DESC;

-- ===========================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================================================

COMMENT ON TABLE companies IS 'Multi-tenant companies using the system';
COMMENT ON TABLE users IS 'All users (super_admin, company_admin, employees)';
COMMENT ON TABLE employees IS 'Extended employee information for company users';
COMMENT ON TABLE work_sessions IS 'Main time tracking sessions';
COMMENT ON TABLE breaks IS 'Break periods within work sessions';
COMMENT ON TABLE absence_requests IS 'Vacation, sick leave, and other absence requests';
COMMENT ON TABLE time_correction_requests IS 'Requests to correct timesheet errors';
COMMENT ON TABLE audit_logs IS 'Audit trail for critical system changes';
COMMENT ON TABLE company_settings IS 'Configurable settings per company (tenant)';

COMMENT ON COLUMN users.company_id IS 'NULL only for super_admin users';
COMMENT ON COLUMN absence_requests.year IS 'Vacation year for tracking annual limits';
COMMENT ON COLUMN work_sessions.total_hours IS 'Calculated field updated via trigger';