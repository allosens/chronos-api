# 🗄️ Chronos Database Schema

Este directorio contiene el esquema de base de datos PostgreSQL completo para el sistema Chronos Time Tracking.

## 📋 Estructura del Schema

### 🏢 **Multi-tenancy & Empresas**

- **`companies`** - Empresas del sistema con planes de suscripción
- **`company_settings`** - Configuraciones específicas por empresa (políticas, horarios, etc.)
- **`users`** - Todos los usuarios del sistema (super_admin, company_admin, employees)
- **`employees`** - Información extendida de empleados por empresa

### ⏰ **Time Tracking**

- **`work_sessions`** - Sesiones de trabajo principal (fichajes)
- **`breaks`** - Pausas durante las sesiones de trabajo
- **`time_correction_requests`** - Solicitudes de corrección de fichajes

### 🏖️ **Gestión de Ausencias**

- **`absence_requests`** - Solicitudes de vacaciones, bajas médicas, etc.

### 💰 **Facturación**

- **`invoices`** - Facturas por suscripciones
- **`invoice_items`** - Líneas de facturación

### 🔐 **Auditoría & Seguridad**

- **`audit_logs`** - Registro de auditoría para cambios críticos
- **`password_reset_tokens`** - Tokens para recuperación de contraseñas

## 🚀 Instalación Rápida

### Pre-requisitos

- PostgreSQL 12+ instalado y ejecutándose
- Usuario con permisos para crear bases de datos

### Instalación Automática

```bash
cd database/
./migrate.sh
```

El script te guiará a través de la instalación y te preguntará si quieres datos de ejemplo.

### Instalación Manual

```bash
# Crear base de datos
createdb chronos_db

# Aplicar schema
psql -d chronos_db -f schema.sql

# Insertar datos de ejemplo (opcional)
psql -d chronos_db -f sample-data.sql
```

### Variables de Entorno

Puedes configurar la conexión usando variables de entorno:

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=chronos_db
export DB_USER=chronos_user
export DB_PASSWORD=chronos_password
```

## 🔧 Opciones de Migración

### Solo Schema (sin datos de ejemplo)

```bash
./migrate.sh --schema-only
```

### Reset completo de la base de datos

```bash
./migrate.sh --reset
```

### Configuración personalizada

```bash
./migrate.sh --host myserver.com --port 5432 --dbname production_chronos --user prod_user --password mypassword
```

## 📊 Datos de Ejemplo

Los datos de ejemplo incluyen:

### 🏢 **3 Empresas de prueba:**

- **Acme Corporation** (Plan Professional) - 4 empleados
- **Tech Solutions SL** (Plan Starter) - 2 empleados
- **Startup Inc** (Plan Free) - 2 empleados

### 👥 **Usuarios de prueba:**

#### Super Admin (sin empresa)

- **Email:** `admin@chronos.com`
- **Password:** `password123` _(hasheada en BD)_

#### Acme Corporation

- **Admin:** `admin@acme.com` / `password123`
- **Empleados:**
  - `maria.garcia@acme.com`
  - `carlos.lopez@acme.com`
  - `ana.rodriguez@acme.com`

#### Tech Solutions SL

- **Admin:** `admin@techsolutions.es`
- **Empleado:** `pedro.sanchez@techsolutions.es`

#### Startup Inc

- **CEO:** `ceo@startup.com`
- **Desarrollador:** `dev@startup.com`

### 📈 **Datos de Time Tracking**

- Sesiones de trabajo activas y completadas
- Pausas de ejemplo
- Solicitudes de vacaciones (aprobadas y pendientes)
- Solicitudes de corrección de fichajes

## 🔍 Consultas Útiles

### Ver empleados activos por empresa

```sql
SELECT
    c.name as company,
    u.first_name,
    u.last_name,
    e.position,
    e.department
FROM employee_details e
JOIN companies c ON e.company_id = c.id
WHERE e.status = 'active';
```

### Estado actual de trabajo

```sql
SELECT
    u.first_name || ' ' || u.last_name as employee,
    c.name as company,
    ws.status,
    ws.clock_in,
    ws.clock_out
FROM current_work_status ws
JOIN users u ON ws.user_id = u.id
JOIN companies c ON u.company_id = c.id;
```

### Vacaciones pendientes de aprobación

```sql
SELECT
    u.first_name || ' ' || u.last_name as employee,
    ar.type,
    ar.start_date,
    ar.end_date,
    ar.total_days,
    ar.requested_at
FROM absence_requests ar
JOIN users u ON ar.user_id = u.id
WHERE ar.status = 'pending'
ORDER BY ar.requested_at DESC;
```

### Horas trabajadas por empleado (mes actual)

```sql
SELECT
    u.first_name || ' ' || u.last_name as employee,
    COUNT(*) as days_worked,
    ROUND(SUM(ws.total_hours), 2) as total_hours,
    ROUND(AVG(ws.total_hours), 2) as avg_hours_per_day
FROM work_sessions ws
JOIN users u ON ws.user_id = u.id
WHERE ws.date >= date_trunc('month', CURRENT_DATE)
  AND ws.clock_out IS NOT NULL
GROUP BY u.id, u.first_name, u.last_name
ORDER BY total_hours DESC;
```

## 🛠️ Funciones Útiles

### Calcular horas de una sesión

```sql
SELECT calculate_work_session_hours('session_uuid');
```

### Obtener días de vacaciones usados

```sql
SELECT get_vacation_days_used('user_uuid', 2025);
```

### Configurar empresa nueva

```sql
SELECT setup_default_company_settings('company_uuid');
```

## 📈 Índices Optimizados

El schema incluye índices optimizados para:

- **Consultas por empresa** (`company_id`)
- **Time tracking por usuario y fecha** (`user_id`, `date`)
- **Búsquedas de estado de trabajo** (`status`)
- **Auditoría por entidad** (`entity_type`, `entity_id`)
- **Solicitudes por estado** (`status`)

## 🔐 Características de Seguridad

### Soft Deletes

- **Habilitado para:** `users`, `companies`
- **No habilitado para:** `work_sessions`, `absence_requests` (obligación legal)

### Auditoría

- **Registro automático** de cambios críticos
- **Conservación de datos** para cumplimiento legal
- **Trazabilidad completa** de modificaciones

### Multi-tenancy

- **Aislamiento por empresa** garantizado
- **Políticas configurables** por tenant
- **Escalabilidad horizontal** preparada

## 📝 Triggers Automáticos

- **`updated_at`** - Se actualiza automáticamente en modificaciones
- **Validaciones de integridad** - Constraints para datos consistentes
- **Cálculos automáticos** - Horas trabajadas, duraciones, etc.

## 🐳 Docker (Opcional)

Si prefieres usar Docker para PostgreSQL:

```bash
# Levantar PostgreSQL con Docker
docker run --name chronos-postgres \
  -e POSTGRES_DB=chronos_db \
  -e POSTGRES_USER=chronos_user \
  -e POSTGRES_PASSWORD=chronos_password \
  -p 5432:5432 \
  -d postgres:15

# Esperar a que esté listo
sleep 10

# Ejecutar migración
DB_HOST=localhost ./migrate.sh
```

## 🔄 Backups

### Backup completo

```bash
pg_dump -h localhost -U chronos_user chronos_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore desde backup

```bash
psql -h localhost -U chronos_user -d chronos_db < backup_20251121_140000.sql
```

## 📞 Soporte

Si encuentras algún problema con el schema o la migración:

1. **Verifica** que PostgreSQL esté ejecutándose
2. **Revisa** los logs de la migración
3. **Comprueba** los permisos de usuario
4. **Consulta** la documentación de PostgreSQL

¿Preguntas? Abre un issue en el repositorio del proyecto.
