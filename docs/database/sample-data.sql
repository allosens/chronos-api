-- ===========================================================================
-- CHRONOS TIME TRACKING SYSTEM - Sample Data
-- ===========================================================================
-- Sample data for development and testing purposes
-- ===========================================================================

-- Sample companies
INSERT INTO companies (id, name, email, phone, address, subscription_plan, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Acme Corporation', 'admin@acme.com', '+34 911 123 456', 'Calle Gran Vía, 1, 28013 Madrid', 'professional', true),
('550e8400-e29b-41d4-a716-446655440002', 'Tech Solutions SL', 'contact@techsolutions.es', '+34 932 654 987', 'Passeig de Gràcia, 50, 08007 Barcelona', 'starter', true),
('550e8400-e29b-41d4-a716-446655440003', 'Startup Inc', 'info@startup.com', '+34 954 789 123', 'Calle Sierpes, 20, 41004 Sevilla', 'free', true);

-- Super Admin (no company)
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440010', NULL, 'admin@chronos.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'System', 'Administrator', 'super_admin', true, NOW());

-- Company: Acme Corporation users
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'admin@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'John', 'Manager', 'company_admin', true, NOW()),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'maria.garcia@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'María', 'García', 'employee', true, NOW()),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'carlos.lopez@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Carlos', 'López', 'employee', true, NOW()),
('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'ana.rodriguez@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Ana', 'Rodríguez', 'employee', true, NOW());

-- Company: Tech Solutions users  
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'admin@techsolutions.es', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Laura', 'Martínez', 'company_admin', true, NOW()),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'pedro.sanchez@techsolutions.es', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Pedro', 'Sánchez', 'employee', true, NOW());

-- Company: Startup Inc users
INSERT INTO users (id, company_id, email, password_hash, first_name, last_name, role, is_active, email_verified_at) VALUES
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440003', 'ceo@startup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'David', 'Startup', 'company_admin', true, NOW()),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440003', 'dev@startup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Sofia', 'Developer', 'employee', true, NOW());

-- Employee details for Acme Corporation
INSERT INTO employees (id, user_id, company_id, employee_number, position, department, phone_number, hire_date, vacation_days_per_year) VALUES
('650e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'EMP001', 'Operations Manager', 'Operations', '+34 666 111 111', '2023-01-15', 25),
('650e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'EMP002', 'Software Developer', 'Development', '+34 666 222 222', '2023-03-01', 22),
('650e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'EMP003', 'Marketing Specialist', 'Marketing', '+34 666 333 333', '2023-06-15', 22),
('650e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'EMP004', 'QA Engineer', 'Development', '+34 666 444 444', '2023-09-01', 22);

-- Employee details for Tech Solutions
INSERT INTO employees (id, user_id, company_id, employee_number, position, department, hire_date) VALUES
('650e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'TS001', 'CEO', 'Management', '2022-01-01'),
('650e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'TS002', 'Senior Developer', 'Development', '2022-03-15');

-- Employee details for Startup Inc
INSERT INTO employees (id, user_id, company_id, employee_number, position, department, hire_date, vacation_days_per_year) VALUES
('650e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440003', 'ST001', 'Founder & CEO', 'Management', '2024-01-01', 30),
('650e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440003', 'ST002', 'Full Stack Developer', 'Development', '2024-02-15', 22);

-- Setup default company settings for all companies
SELECT setup_default_company_settings('550e8400-e29b-41d4-a716-446655440001');
SELECT setup_default_company_settings('550e8400-e29b-41d4-a716-446655440002');
SELECT setup_default_company_settings('550e8400-e29b-41d4-a716-446655440003');

-- Sample work sessions (recent data)
-- María García working today
INSERT INTO work_sessions (id, user_id, company_id, date, clock_in, clock_out, status, total_hours) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, CURRENT_DATE + TIME '09:00:00', CURRENT_DATE + TIME '17:30:00', 'clocked_out', 8.0);

-- Carlos López working today (still active)
INSERT INTO work_sessions (id, user_id, company_id, date, clock_in, status) VALUES
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, CURRENT_DATE + TIME '08:30:00', 'working');

-- Ana Rodríguez on break
INSERT INTO work_sessions (id, user_id, company_id, date, clock_in, status) VALUES  
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, CURRENT_DATE + TIME '09:15:00', 'on_break');

-- Sample breaks
INSERT INTO breaks (id, work_session_id, start_time, end_time, duration_minutes) VALUES
('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + TIME '12:00:00', CURRENT_DATE + TIME '13:00:00', 60),
('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + TIME '15:30:00', CURRENT_DATE + TIME '15:45:00', 15);

-- Current break for Ana (not finished)
INSERT INTO breaks (id, work_session_id, start_time) VALUES
('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', CURRENT_DATE + TIME '14:00:00');

-- Sample absence requests
INSERT INTO absence_requests (id, user_id, company_id, type, start_date, end_date, total_days, year, comments, status, requested_at) VALUES
-- Approved vacation
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'vacation', CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '37 days', 5, 2025, 'Summer vacation', 'approved', NOW() - INTERVAL '10 days'),

-- Pending vacation
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'vacation', CURRENT_DATE + INTERVAL '60 days', CURRENT_DATE + INTERVAL '74 days', 10, 2025, 'Christmas holidays', 'pending', NOW() - INTERVAL '2 days'),

-- Sick leave
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'sick_leave', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '1 day', 3, 2025, 'Flu', 'approved', NOW() - INTERVAL '5 days');

-- Sample time correction requests
INSERT INTO time_correction_requests (id, user_id, company_id, work_session_id, original_clock_in, original_clock_out, requested_clock_in, requested_clock_out, reason, status, created_at) VALUES
('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + TIME '09:00:00', CURRENT_DATE + TIME '17:30:00', CURRENT_DATE + TIME '08:45:00', CURRENT_DATE + TIME '17:30:00', 'Llegué antes pero olvidé fichar', 'pending', NOW() - INTERVAL '1 hour');

-- Sample invoices
INSERT INTO invoices (id, company_id, invoice_number, invoice_date, due_date, amount, status) VALUES
('b50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'INV-2025-001', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 99.00, 'paid'),
('b50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'INV-2025-002', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 29.00, 'pending');

-- Sample invoice items
INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total) VALUES
('c50e8400-e29b-41d4-a716-446655440001', 'b50e8400-e29b-41d4-a716-446655440001', 'Professional Plan - Monthly', 1, 99.00, 99.00),
('c50e8400-e29b-41d4-a716-446655440002', 'b50e8400-e29b-41d4-a716-446655440002', 'Starter Plan - Monthly', 1, 29.00, 29.00);

-- Sample audit logs
INSERT INTO audit_logs (id, user_id, company_id, entity_type, entity_id, action, new_values) VALUES
('d50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'users', '550e8400-e29b-41d4-a716-446655440012', 'created', '{"email": "maria.garcia@acme.com", "role": "employee"}'),
('d50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'work_sessions', '750e8400-e29b-41d4-a716-446655440001', 'created', '{"date": "today", "clock_in": "09:00"}'),
('d50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'absence_requests', '950e8400-e29b-41d4-a716-446655440001', 'created', '{"type": "vacation", "days": 5}');

-- ===========================================================================
-- VERIFICATION QUERIES
-- ===========================================================================

-- Verify data was inserted correctly
DO $$
BEGIN
    RAISE NOTICE 'Companies inserted: %', (SELECT COUNT(*) FROM companies);
    RAISE NOTICE 'Users inserted: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Employees inserted: %', (SELECT COUNT(*) FROM employees);
    RAISE NOTICE 'Work sessions inserted: %', (SELECT COUNT(*) FROM work_sessions);
    RAISE NOTICE 'Breaks inserted: %', (SELECT COUNT(*) FROM breaks);
    RAISE NOTICE 'Absence requests inserted: %', (SELECT COUNT(*) FROM absence_requests);
    RAISE NOTICE 'Time correction requests inserted: %', (SELECT COUNT(*) FROM time_correction_requests);
    RAISE NOTICE 'Invoices inserted: %', (SELECT COUNT(*) FROM invoices);
    RAISE NOTICE 'Audit logs inserted: %', (SELECT COUNT(*) FROM audit_logs);
    
    RAISE NOTICE 'Sample data setup completed successfully!';
END $$;