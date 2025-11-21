# 🤖 Agent Instructions for Chronos API

This document provides comprehensive instructions for AI assistants working on the Chronos Time Tracking API. These instructions help ensure consistency, best practices, and proper implementation patterns throughout the codebase.

## 📋 Project Context

**Chronos API** is a comprehensive NestJS-based backend service for employee time tracking and HR management. It provides:

- **Multi-tenant Architecture**: Company-isolated data with configurable policies
- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Time Tracking**: Clock in/out, breaks, work sessions, and timesheet management
- **Employee Management**: Profiles, roles, and company hierarchy
- **Reporting**: Detailed time and attendance reports
- **Leave Management**: Vacation requests, sick leave, and absence tracking
- **Billing Integration**: Time-based billing and invoice generation

## 🏗️ Architecture & Patterns

### Framework & Technology Stack

- **Framework**: NestJS with Fastify adapter
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL with database-first approach
- **Authentication**: JWT tokens with role-based guards
- **Testing**: Vitest + Supertest (unit and e2e)
- **Package Manager**: pnpm
- **Code Quality**: ESLint + Prettier + Husky

### Directory Structure

```
src/
├── app/                    # Application configuration and main modules
│   ├── app.module.ts      # Root application module
│   └── health/            # Health check endpoints
├── contexts/              # Domain contexts (DDD-style organization)
│   ├── auth/             # Authentication and authorization
│   ├── companies/        # Company management
│   ├── employees/        # Employee management
│   ├── time-tracking/    # Time tracking and timesheets
│   ├── reports/          # Reporting and analytics
│   └── shared/           # Shared utilities and services
└── main.ts               # Application entry point
```

## 🔧 Development Guidelines

### 1. Module Organization

- **Use Domain-Driven Design**: Organize code by business domains in `src/contexts/`
- **Module Structure**: Each context should have clear separation:
  ```
  context-name/
  ├── {context}.module.ts           # NestJS module definition
  ├── controllers/                  # HTTP controllers
  ├── services/                     # Business logic services
  ├── models/                       # Data models and DTOs
  ├── guards/                       # Authentication/authorization guards
  ├── interfaces/                   # TypeScript interfaces
  └── tests/                        # Unit and integration tests
  ```

### 2. Naming Conventions

- **Files**: Use kebab-case (e.g., `time-tracking.service.ts`)
- **Classes**: Use PascalCase (e.g., `TimeTrackingService`)
- **Interfaces**: Prefix with `I` (e.g., `ITimeEntry`)
- **DTOs**: Suffix with `Dto` (e.g., `CreateTimeEntryDto`)
- **Guards**: Suffix with `Guard` (e.g., `RoleGuard`)
- **Decorators**: Use PascalCase (e.g., `@Roles('admin')`)

### 3. Database Integration

- **Database**: PostgreSQL with connection via environment variables
- **Migrations**: Use the migration scripts in `/database` folder
- **Queries**: Write efficient queries with proper indexing
- **Transactions**: Use database transactions for multi-step operations
- **Multi-tenancy**: Always filter by `company_id` in queries

### 4. API Design Patterns

- **RESTful APIs**: Follow REST conventions
- **Route Prefix**: All routes prefixed with `/api`
- **Versioning**: Use URI versioning when needed (`/api/v1/`)
- **Status Codes**: Use appropriate HTTP status codes
- **Response Format**: Consistent JSON response structure
- **Error Handling**: Use NestJS exception filters
- **Validation**: Use class-validator decorators on DTOs

### 5. Authentication & Authorization

- **JWT Strategy**: Implement JWT authentication strategy
- **Role-Based Access**: Use guards for role-based authorization
- **Multi-tenant Security**: Ensure data isolation between companies
- **Guards**: Apply guards at controller or method level
- **Decorators**: Use custom decorators for user/company context

### 6. Testing Strategy

- **Unit Tests**: Test individual services and components
- **Integration Tests**: Test controller endpoints with real database
- **Test Files**: Place in `tests/` folder with `.test.ts` suffix
- **Mocking**: Use Vitest mocking for external dependencies
- **Test Database**: Use separate test database configuration

## 📝 Code Examples & Patterns

### Creating a New Service

```typescript
import { Injectable, Inject, Logger } from "@nestjs/common";

@Injectable()
export class TimeTrackingService {
  constructor(
    @Inject(Logger) private readonly logger: Logger,
    // Inject other dependencies
  ) {}

  async createTimeEntry(dto: CreateTimeEntryDto): Promise<TimeEntry> {
    this.logger.log(`Creating time entry for employee ${dto.employeeId}`);
    // Implementation
  }
}
```

### Controller with Guards

```typescript
import { Controller, Post, Get, UseGuards, Body } from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";

@Controller("time-tracking")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post()
  @Roles("employee", "manager", "admin")
  async createTimeEntry(@Body() dto: CreateTimeEntryDto) {
    return this.timeTrackingService.createTimeEntry(dto);
  }
}
```

### DTO with Validation

```typescript
import { IsNotEmpty, IsUUID, IsDateString, IsOptional } from "class-validator";

export class CreateTimeEntryDto {
  @IsUUID()
  @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsUUID()
  @IsNotEmpty()
  companyId: string;
}
```

## 🚨 Important Rules & Constraints

### Security Requirements

1. **Always validate input**: Use DTOs with validation decorators
2. **Multi-tenant isolation**: Never expose data across companies
3. **Authentication**: Require authentication for all non-public endpoints
4. **Authorization**: Check user roles and permissions
5. **Sanitization**: Sanitize user input to prevent injection attacks

### Performance Guidelines

1. **Database queries**: Use efficient queries with proper indexes
2. **Pagination**: Implement pagination for list endpoints
3. **Caching**: Use caching for frequently accessed data
4. **Async operations**: Use async/await properly
5. **Connection pooling**: Configure database connection pooling

### Error Handling

1. **Consistent errors**: Use NestJS built-in exceptions
2. **Logging**: Log errors with appropriate context
3. **User-friendly messages**: Return meaningful error messages
4. **Status codes**: Use correct HTTP status codes
5. **Validation errors**: Handle validation errors gracefully

### Code Quality

1. **TypeScript strict**: Enable strict TypeScript checks
2. **Linting**: Follow ESLint rules
3. **Formatting**: Use Prettier for consistent formatting
4. **Testing**: Maintain good test coverage
5. **Documentation**: Document complex business logic

## 🧪 Testing Guidelines

### Unit Test Example

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { TimeTrackingService } from "./time-tracking.service";

describe("TimeTrackingService", () => {
  let service: TimeTrackingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeTrackingService],
    }).compile();

    service = module.get<TimeTrackingService>(TimeTrackingService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
```

### Integration Test Example

```typescript
import request from "supertest";
import { Test } from "@nestjs/testing";
import { AppModule } from "../app.module";

describe("TimeTrackingController (e2e)", () => {
  let app;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it("/time-tracking (POST)", () => {
    return request(app.getHttpServer())
      .post("/api/time-tracking")
      .send({ employeeId: "uuid", startTime: "2023-01-01T09:00:00Z" })
      .expect(201);
  });
});
```

## 📚 Resources & References

### Official Documentation

- [NestJS Documentation](https://docs.nestjs.com/)
- [Fastify Documentation](https://fastify.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Project-Specific

- **Environment Variables**: See `.env.example` for configuration
- **Database Schema**: See `/database/schema.sql` for complete schema
- **API Documentation**: Will be available at `/api/docs` once implemented
- **Development Guide**: See `README.md` for setup instructions

## 🎯 Common Tasks

When working on this project, you might need to:

1. **Add a new endpoint**: Create controller method with proper guards and validation
2. **Add a new business feature**: Create service in appropriate context folder
3. **Database changes**: Update schema and create migration scripts
4. **Add authentication**: Implement guards and protect routes
5. **Add validation**: Use class-validator decorators on DTOs
6. **Write tests**: Create unit and integration tests following patterns
7. **Debug issues**: Check logs, database queries, and authentication flow

## 💡 Tips for AI Assistants

- **Always consider multi-tenancy**: Ensure company data isolation
- **Follow the established patterns**: Use existing code as examples
- **Prefer composition**: Use dependency injection and modular design
- **Test your code**: Write tests for new functionality
- **Check security**: Validate authentication and authorization
- **Use TypeScript features**: Leverage interfaces, generics, and strict typing
- **Follow NestJS conventions**: Use decorators, modules, and dependency injection
- **Consider performance**: Think about database efficiency and caching

---

_This document should be updated as the project evolves and new patterns are established._
