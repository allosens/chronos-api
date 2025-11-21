# 📊 Schema de Base de Datos - Diagrama ERD

```mermaid
erDiagram
    COMPANIES {
        uuid id PK
        varchar name
        varchar email
        varchar phone
        text address
        subscription_plan subscription_plan
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    USERS {
        uuid id PK
        uuid company_id FK
        varchar email
        varchar password_hash
        varchar first_name
        varchar last_name
        user_role role
        boolean is_active
        timestamptz email_verified_at
        timestamptz last_login_at
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    EMPLOYEES {
        uuid id PK
        uuid user_id FK
        uuid company_id FK
        varchar employee_number
        varchar position
        varchar department
        varchar phone_number
        date hire_date
        employee_status status
        integer vacation_days_per_year
        timestamptz created_at
        timestamptz updated_at
        timestamptz deactivated_at
        uuid deactivated_by FK
    }

    COMPANY_SETTINGS {
        uuid id PK
        uuid company_id FK
        varchar setting_key
        jsonb setting_value
        timestamptz created_at
        timestamptz updated_at
    }

    WORK_SESSIONS {
        uuid id PK
        uuid user_id FK
        uuid company_id FK
        date date
        timestamptz clock_in
        timestamptz clock_out
        work_status status
        decimal total_hours
        text notes
        timestamptz created_at
        timestamptz updated_at
    }

    BREAKS {
        uuid id PK
        uuid work_session_id FK
        timestamptz start_time
        timestamptz end_time
        integer duration_minutes
        timestamptz created_at
    }

    ABSENCE_REQUESTS {
        uuid id PK
        uuid user_id FK
        uuid company_id FK
        absence_type type
        date start_date
        date end_date
        integer total_days
        integer year
        text comments
        request_status status
        timestamptz requested_at
        timestamptz reviewed_at
        uuid reviewed_by FK
        text review_comments
    }

    TIME_CORRECTION_REQUESTS {
        uuid id PK
        uuid user_id FK
        uuid company_id FK
        uuid work_session_id FK
        timestamptz original_clock_in
        timestamptz original_clock_out
        timestamptz requested_clock_in
        timestamptz requested_clock_out
        text reason
        request_status status
        timestamptz created_at
        timestamptz reviewed_at
        uuid reviewed_by FK
        text review_notes
    }

    INVOICES {
        uuid id PK
        uuid company_id FK
        varchar invoice_number
        date invoice_date
        date due_date
        decimal amount
        varchar currency
        invoice_status status
        text notes
        timestamptz created_at
        timestamptz paid_at
    }

    INVOICE_ITEMS {
        uuid id PK
        uuid invoice_id FK
        varchar description
        decimal quantity
        decimal unit_price
        decimal total
        timestamptz created_at
    }

    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        uuid company_id FK
        varchar entity_type
        uuid entity_id
        audit_action action
        jsonb old_values
        jsonb new_values
        inet ip_address
        text user_agent
        timestamptz created_at
    }

    PASSWORD_RESET_TOKENS {
        uuid id PK
        uuid user_id FK
        varchar token
        timestamptz expires_at
        timestamptz used_at
        timestamptz created_at
    }

    %% Relationships
    COMPANIES ||--o{ USERS : "belongs to"
    COMPANIES ||--o{ COMPANY_SETTINGS : "has"
    COMPANIES ||--o{ INVOICES : "has"

    USERS ||--o| EMPLOYEES : "extends"
    USERS ||--o{ WORK_SESSIONS : "creates"
    USERS ||--o{ ABSENCE_REQUESTS : "makes"
    USERS ||--o{ TIME_CORRECTION_REQUESTS : "submits"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "requests"
    USERS ||--o{ AUDIT_LOGS : "performs"

    WORK_SESSIONS ||--o{ BREAKS : "contains"
    WORK_SESSIONS ||--o{ TIME_CORRECTION_REQUESTS : "corrects"

    INVOICES ||--o{ INVOICE_ITEMS : "contains"

    USERS ||--o{ ABSENCE_REQUESTS : "reviews"
    USERS ||--o{ TIME_CORRECTION_REQUESTS : "reviews"
    USERS ||--o{ EMPLOYEES : "deactivates"
```

## 🔗 Relaciones Principales

### 🏢 **Multi-tenancy**

- `COMPANIES` 1:N `USERS` (excepto super_admin)
- `COMPANIES` 1:N `COMPANY_SETTINGS`
- Aislamiento completo por empresa

### 👥 **Usuarios & Empleados**

- `USERS` 1:1 `EMPLOYEES` (solo para empleados)
- `USERS` pueden ser: super_admin, company_admin, employee
- Soft delete en `USERS` y `COMPANIES`

### ⏰ **Time Tracking**

- `WORK_SESSIONS` 1:N `BREAKS`
- `WORK_SESSIONS` 1:N `TIME_CORRECTION_REQUESTS`
- Múltiples sesiones por día permitidas

### 🏖️ **Gestión de Ausencias**

- `ABSENCE_REQUESTS` rastrean vacaciones por año
- Estados: pending, approved, rejected, cancelled
- Auditoría completa de aprobaciones

### 💰 **Facturación**

- `INVOICES` 1:N `INVOICE_ITEMS`
- Soporte multi-moneda
- Estados de facturación completos

### 🔐 **Auditoría & Seguridad**

- `AUDIT_LOGS` para trazabilidad
- `PASSWORD_RESET_TOKENS` con expiración
- Registro de IP y User-Agent

## 📋 Constraints Importantes

### 🔒 **Integridad de Datos**

```sql
-- Super admin no puede tener company_id
CONSTRAINT users_super_admin_no_company

-- Empleados deben pertenecer a la misma empresa que el usuario
CONSTRAINT employees_same_company

-- Fechas válidas en work_sessions y breaks
CONSTRAINT work_sessions_valid_times
CONSTRAINT breaks_valid_times

-- Fechas válidas en absence_requests
CONSTRAINT absence_requests_valid_dates
```

### 🚦 **Enums de Estado**

- **user_role**: super_admin, company_admin, employee
- **work_status**: clocked_out, working, on_break
- **request_status**: pending, approved, rejected, cancelled
- **subscription_plan**: free, starter, professional, enterprise

## 🎯 **Índices de Performance**

### ⚡ **Consultas Críticas Optimizadas**

- Time tracking por usuario/fecha: `(user_id, date)`
- Consultas por empresa: `(company_id)`
- Búsquedas por estado: `(status)`
- Auditoría por entidad: `(entity_type, entity_id)`
- Solicitudes pendientes: `(company_id, status)`

### 📈 **Escalabilidad**

- Particionado preparado para `work_sessions` por fecha
- Índices compuestos para consultas multi-tenant
- Views optimizadas para consultas frecuentes
