-- ===========================================================================
-- CHRONOS TIME TRACKING SYSTEM - Sample Data
-- ===========================================================================
-- Sample data for development and testing purposes
-- ===========================================================================

-- Sample companies
INSERT INTO companies (id, name, email, phone, address, "subscriptionPlan", "isActive") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Acme Corporation', 'admin@acme.com', '+34 911 123 456', 'Calle Gran Vía, 1, 28013 Madrid', 'PROFESSIONAL', true),
('550e8400-e29b-41d4-a716-446655440002', 'Tech Solutions SL', 'contact@techsolutions.es', '+34 932 654 987', 'Passeig de Gràcia, 50, 08007 Barcelona', 'STARTER', true),
('550e8400-e29b-41d4-a716-446655440003', 'Startup Inc', 'info@startup.com', '+34 954 789 123', 'Calle Sierpes, 20, 41004 Sevilla', 'FREE', true);

-- Super Admin (no company)
INSERT INTO users (id, "companyId", email, "passwordHash", "firstName", "lastName", role, "isActive", "emailVerifiedAt") VALUES
('550e8400-e29b-41d4-a716-446655440010', NULL, 'admin@chronos.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'System', 'Administrator', 'SUPER_ADMIN', true, NOW());

-- Company: Acme Corporation users
INSERT INTO users (id, "companyId", email, "passwordHash", "firstName", "lastName", role, "isActive", "emailVerifiedAt") VALUES
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'admin@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'John', 'Manager', 'COMPANY_ADMIN', true, NOW()),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'maria.garcia@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'María', 'García', 'EMPLOYEE', true, NOW()),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'carlos.lopez@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Carlos', 'López', 'EMPLOYEE', true, NOW()),
('550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'ana.rodriguez@acme.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Ana', 'Rodríguez', 'EMPLOYEE', true, NOW());

-- Company: Tech Solutions users  
INSERT INTO users (id, "companyId", email, "passwordHash", "firstName", "lastName", role, "isActive", "emailVerifiedAt") VALUES
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'admin@techsolutions.es', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Laura', 'Martínez', 'COMPANY_ADMIN', true, NOW()),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'pedro.sanchez@techsolutions.es', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Pedro', 'Sánchez', 'EMPLOYEE', true, NOW());

-- Company: Startup Inc users
INSERT INTO users (id, "companyId", email, "passwordHash", "firstName", "lastName", role, "isActive", "emailVerifiedAt") VALUES
('550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440003', 'ceo@startup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'David', 'Startup', 'COMPANY_ADMIN', true, NOW()),
('550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440003', 'dev@startup.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LdKGp.xyz', 'Sofia', 'Developer', 'EMPLOYEE', true, NOW());

-- Employee details for Acme Corporation
INSERT INTO employees (id, "userId", "companyId", "employeeNumber", position, department, "phoneNumber", "hireDate", "vacationDaysPerYear") VALUES
('650e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'EMP001', 'Operations Manager', 'Operations', '+34 666 111 111', '2023-01-15', 25),
('650e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'EMP002', 'Software Developer', 'Development', '+34 666 222 222', '2023-03-01', 22),
('650e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'EMP003', 'Marketing Specialist', 'Marketing', '+34 666 333 333', '2023-06-15', 22),
('650e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'EMP004', 'QA Engineer', 'Development', '+34 666 444 444', '2023-09-01', 22);

-- Employee details for Tech Solutions
INSERT INTO employees (id, "userId", "companyId", "employeeNumber", position, department, "hireDate") VALUES
('650e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440002', 'TS001', 'CEO', 'Management', '2022-01-01'),
('650e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', 'TS002', 'Senior Developer', 'Development', '2022-03-15');

-- Employee details for Startup Inc
INSERT INTO employees (id, "userId", "companyId", "employeeNumber", position, department, "hireDate", "vacationDaysPerYear") VALUES
('650e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440031', '550e8400-e29b-41d4-a716-446655440003', 'ST001', 'Founder & CEO', 'Management', '2024-01-01', 30),
('650e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440032', '550e8400-e29b-41d4-a716-446655440003', 'ST002', 'Full Stack Developer', 'Development', '2024-02-15', 22);

-- Setup default company settings for all companies  
-- Note: Using direct INSERT instead of function calls
INSERT INTO company_settings (\"companyId\", \"settingKey\", \"settingValue\") VALUES
('550e8400-e29b-41d4-a716-446655440001', 'working_hours', '{"daily": 8, "weekly": 40}'),
('550e8400-e29b-41d4-a716-446655440001', 'vacation_policy', '{"default_days_per_year": 22, "max_consecutive_days": 15}'),
('550e8400-e29b-41d4-a716-446655440001', 'break_policy', '{"min_break_duration": 15, "max_break_duration": 120}'),
('550e8400-e29b-41d4-a716-446655440001', 'time_tracking', '{"auto_clock_out": false, "require_break_reason": false}'),

('550e8400-e29b-41d4-a716-446655440002', 'working_hours', '{"daily": 8, "weekly": 40}'),
('550e8400-e29b-41d4-a716-446655440002', 'vacation_policy', '{"default_days_per_year": 22, "max_consecutive_days": 15}'),
('550e8400-e29b-41d4-a716-446655440002', 'break_policy', '{"min_break_duration": 15, "max_break_duration": 120}'),
('550e8400-e29b-41d4-a716-446655440002', 'time_tracking', '{"auto_clock_out": false, "require_break_reason": false}'),

('550e8400-e29b-41d4-a716-446655440003', 'working_hours', '{"daily": 8, "weekly": 40}'),
('550e8400-e29b-41d4-a716-446655440003', 'vacation_policy', '{"default_days_per_year": 22, "max_consecutive_days": 15}'),
('550e8400-e29b-41d4-a716-446655440003', 'break_policy', '{"min_break_duration": 15, "max_break_duration": 120}'),
('550e8400-e29b-41d4-a716-446655440003', 'time_tracking', '{"auto_clock_out": false, "require_break_reason": false}');

-- Sample work sessions (recent data)
-- María García working today
INSERT INTO work_sessions (id, "userId", "companyId", date, "clockIn", "clockOut", status, "totalHours") VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, CURRENT_DATE + TIME '09:00:00', CURRENT_DATE + TIME '17:30:00', 'CLOCKED_OUT', 8.0);

-- Carlos López working today (still active)
INSERT INTO work_sessions (id, "userId", "companyId", date, "clockIn", status) VALUES
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, CURRENT_DATE + TIME '08:30:00', 'WORKING');

-- Ana Rodríguez on break
INSERT INTO work_sessions (id, "userId", "companyId", date, "clockIn", status) VALUES  
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', CURRENT_DATE, CURRENT_DATE + TIME '09:15:00', 'ON_BREAK');

-- Sample breaks
INSERT INTO breaks (id, "workSessionId", "startTime", "endTime", "durationMinutes") VALUES
('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + TIME '12:00:00', CURRENT_DATE + TIME '13:00:00', 60),
('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + TIME '15:30:00', CURRENT_DATE + TIME '15:45:00', 15);

-- Current break for Ana (not finished)
INSERT INTO breaks (id, "workSessionId", "startTime") VALUES
('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', CURRENT_DATE + TIME '14:00:00');

-- Sample absence requests
INSERT INTO absence_requests (id, "userId", "companyId", type, "startDate", "endDate", "totalDays", year, comments, status, "requestedAt") VALUES
-- Approved vacation
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'VACATION', CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '37 days', 5, 2025, 'Summer vacation', 'APPROVED', NOW() - INTERVAL '10 days'),

-- Pending vacation
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440001', 'VACATION', CURRENT_DATE + INTERVAL '60 days', CURRENT_DATE + INTERVAL '74 days', 10, 2025, 'Christmas holidays', 'PENDING', NOW() - INTERVAL '2 days'),

-- Sick leave
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440001', 'SICK_LEAVE', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE - INTERVAL '1 day', 3, 2025, 'Flu', 'APPROVED', NOW() - INTERVAL '5 days');

-- Sample time correction requests
INSERT INTO time_correction_requests (id, "userId", "companyId", "workSessionId", "originalClockIn", "originalClockOut", "requestedClockIn", "requestedClockOut", reason, status, "createdAt") VALUES
('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', CURRENT_DATE + TIME '09:00:00', CURRENT_DATE + TIME '17:30:00', CURRENT_DATE + TIME '08:45:00', CURRENT_DATE + TIME '17:30:00', 'Llegué antes pero olvidé fichar', 'PENDING', NOW() - INTERVAL '1 hour');

-- Sample invoices
INSERT INTO invoices (id, "companyId", "invoiceNumber", "invoiceDate", "dueDate", amount, status) VALUES
('b50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'INV-2025-001', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 99.00, 'PAID'),
('b50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'INV-2025-002', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '15 days', 29.00, 'PENDING');

-- Sample invoice items
INSERT INTO invoice_items (id, "invoiceId", description, quantity, "unitPrice", total) VALUES
('c50e8400-e29b-41d4-a716-446655440001', 'b50e8400-e29b-41d4-a716-446655440001', 'Professional Plan - Monthly', 1, 99.00, 99.00),
('c50e8400-e29b-41d4-a716-446655440002', 'b50e8400-e29b-41d4-a716-446655440002', 'Starter Plan - Monthly', 1, 29.00, 29.00);

-- Sample audit logs
INSERT INTO audit_logs (id, "userId", "companyId", "entityType", "entityId", action, "newValues") VALUES
('d50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'users', '550e8400-e29b-41d4-a716-446655440012', 'CREATED', '{"email": "maria.garcia@acme.com", "role": "EMPLOYEE"}'),
('d50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'work_sessions', '750e8400-e29b-41d4-a716-446655440001', 'CREATED', '{"date": "today", "clock_in": "09:00"}'),
('d50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'absence_requests', '950e8400-e29b-41d4-a716-446655440001', 'CREATED', '{"type": "VACATION", "days": 5}');

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