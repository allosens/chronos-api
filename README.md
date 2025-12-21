# 🕐 Chronos API

Backend API for Chronos Time Tracking System - A comprehensive employee time management and HR solution.

## 📋 Project Overview

Chronos API is a robust NestJS-based backend service that powers the Chronos time tracking system. It provides secure authentication, time tracking, employee management, and reporting capabilities for businesses.

## 🚀 Features

- 🔐 **Authentication & Authorization** - JWT-based auth with role-based access control
- 👥 **Multi-tenant Architecture** - Support for multiple companies with data isolation
- ⏰ **Time Tracking** - Clock in/out, breaks, work sessions, and timesheet management
- ✏️ **Time Corrections** - Employee-initiated time correction requests with manager approval workflow
- 🏢 **Employee Management** - Employee profiles, roles, and company hierarchy
- 📊 **Reporting** - Generate detailed time and attendance reports
- 📅 **Leave Management** - Vacation requests, sick leave, and absence tracking
- 💰 **Billing Integration** - Time-based billing and invoice generation
- 📱 **Mobile Ready** - RESTful API designed for web and mobile clients

## 🛠️ Tech Stack

- **Framework**: NestJS with Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **Testing**: Vitest + Supertest
- **Documentation**: OpenAPI/Swagger
- **Containerization**: Docker

## 🏗️ Project Structure

```
src/
├── app/                    # Application configuration and main modules
├── contexts/              # Domain contexts (DDD-style organization)
│   ├── auth/             # Authentication and authorization
│   ├── companies/        # Company management
│   ├── employees/        # Employee management
│   ├── time-tracking/    # Time tracking and timesheets
│   ├── reports/          # Reporting and analytics
│   └── shared/           # Shared utilities and services
└── main.ts               # Application entry point
```

## 🚦 Getting Started

### Prerequisites

- Node.js 22.x or higher
- pnpm 9.x
- PostgreSQL 15+
- Docker (optional)

### Installation

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Set up environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your database configuration
   ```

3. **Set up database**:

   ```bash
   # Run the database migration script from the main project
   cd ../database && ./migrate.sh
   ```

4. **Start development server**:
   ```bash
   pnpm run dev
   ```

The API will be available at `http://localhost:3001`

### Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development
LOGGER_LEVEL=log

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chronos_db
DB_USER=chronos_user
DB_PASSWORD=chronos_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email Configuration (for notifications)
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm run test:unit

# Run e2e tests only
pnpm run test:e2e

# Run tests with coverage
pnpm run test:coverage
```

## 🚀 Deployment

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Production build
docker-compose -f docker-compose.prod.yml up --build
```

### Manual Deployment

```bash
# Build the application
pnpm run build

# Start production server
pnpm start
```

## 📚 API Documentation

Once the server is running, visit:

- **Swagger UI**: `http://localhost:3001/api/docs`
- **OpenAPI JSON**: `http://localhost:3001/api/docs-json`

## 🔒 Security Features

- JWT-based authentication
- Role-based authorization (Admin, Manager, Employee)
- Multi-tenant data isolation
- Request rate limiting
- Input validation and sanitization
- SQL injection prevention
- Audit logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🆘 Support

For support and questions:

- Create an issue in this repository
- Contact the development team
- Check the documentation in `/docs`

---

Made with ❤️ by the Elea Team
