# 🔐 Development Credentials

## Sample Data Login Credentials

Para usar con los datos de muestra (`sample-data.sql`), estas son las credenciales de desarrollo:

### 👑 Super Administrator

- **Email:** `admin@chronos.com`
- **Password:** `admin123`
- **Role:** SUPER_ADMIN
- **Description:** Administrador del sistema completo

### 🏢 Company Administrators

#### Acme Corporation

- **Email:** `admin@acme.com`
- **Password:** `acme123`
- **Role:** COMPANY_ADMIN
- **Company:** Acme Corporation

#### Tech Solutions SL

- **Email:** `admin@techsolutions.es`
- **Password:** `tech123`
- **Role:** COMPANY_ADMIN
- **Company:** Tech Solutions SL

#### Startup Inc

- **Email:** `ceo@startup.com`
- **Password:** `startup123`
- **Role:** COMPANY_ADMIN
- **Company:** Startup Inc

### 👥 Employee Accounts

**Contraseña universal para todos los empleados:** `employee123`

#### Acme Corporation Employees

- **María García:** `maria.garcia@acme.com` / `employee123`
- **Carlos López:** `carlos.lopez@acme.com` / `employee123`
- **Ana Rodríguez:** `ana.rodriguez@acme.com` / `employee123`

#### Tech Solutions Employees

- **Pedro Sánchez:** `pedro.sanchez@techsolutions.es` / `employee123`

#### Startup Inc Employees

- **Sofia Developer:** `dev@startup.com` / `employee123`

## 🧪 Para Testing

Usa estas credenciales en tus tests de integración y desarrollo local.

**⚠️ IMPORTANTE:** Estas contraseñas son solo para desarrollo. NUNCA uses contraseñas simples en producción.

## 📝 Cómo aplicar los datos de muestra

```bash
# Desde el directorio del proyecto
psql -d chronos_dev -f docs/database/sample-data.sql
```

O usando el script de migración:

```bash
npm run db:seed
```

## 🔄 Regenerar hashes

Si necesitas cambiar las contraseñas, puedes generar nuevos hashes:

```javascript
const bcrypt = require("bcrypt");

async function generateHash(password) {
  const hash = await bcrypt.hash(password, 12);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
}

generateHash("tu_nueva_contraseña");
```
