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

### 3. Database Integration & Supabase Tools

- **Database**: PostgreSQL with Supabase integration
- **ORM**: Prisma 7.0 with adapter pattern and connection pooling
- **Migrations**: Use Prisma migrations and Supabase branch management
- **Queries**: Efficient queries with proper indexing and multi-tenant isolation
- **Transactions**: Use database transactions for multi-step operations
- **Multi-tenancy**: Always filter by `company_id` in queries

#### 🔧 **Available Supabase MCP Tools**

**Core Database Operations:**

- **`mcp_supabasechron_list_tables`**: View all database tables with detailed schema information
- **`mcp_supabasechron_execute_sql`**: Execute raw SQL queries for data operations and analysis
- **`mcp_supabasechron_apply_migration`**: Apply database migrations safely (prefer this over execute_sql for DDL)
- **`mcp_supabasechron_generate_typescript_types`**: Generate TypeScript types from database schema

**Development Branch Management:**

- **`mcp_supabasechron_create_branch`**: Create development branches with fresh database copies
- **`mcp_supabasechron_list_branches`**: View all development branches and their statuses
- **`mcp_supabasechron_merge_branch`**: Merge development branches to production
- **`mcp_supabasechron_delete_branch`**: Clean up development branches when done
- **`mcp_supabasechron_rebase_branch`**: Handle migration drift between branches
- **`mcp_supabasechron_reset_branch`**: Reset development branch to specific migration version

**Edge Functions & Serverless:**

- **`mcp_supabasechron_deploy_edge_function`**: Deploy serverless functions to Supabase
- **`mcp_supabasechron_list_edge_functions`**: View all deployed Edge Functions
- **`mcp_supabasechron_get_edge_function`**: Retrieve Edge Function source code

**Monitoring & Diagnostics:**

- **`mcp_supabasechron_get_logs`**: Access service logs (API, Auth, Storage, Edge Functions, Postgres)
- **`mcp_supabasechron_get_advisors`**: Check security and performance recommendations
- **`mcp_supabasechron_list_extensions`**: View installed database extensions
- **`mcp_supabasechron_get_project_url`**: Get API URLs and project information
- **`mcp_supabasechron_get_anon_key`**: Retrieve anonymous API keys for frontend integration

#### 📊 **Current Database Schema (Multi-tenant Time Tracking)**

**Verified Tables in Production:**

1. **🏢 Companies** (`companies`) - 0 records
   - Multi-tenant root entity with settings, plans, and user limits
   - Key fields: `id`, `name`, `slug`, `email`, `timezone`, `settings`, `plan`, `maxUsers`
   - Relationships: Parent to all other entities via `companyId`

2. **👤 Users** (`users`) - 0 records
   - User management with roles and permissions
   - Roles: `ADMIN`, `MANAGER`, `EMPLOYEE` (UserRole enum)
   - Key fields: `id`, `email`, `firstName`, `lastName`, `companyId`, `role`, `permissions`, `hourlyRate`
   - Multi-tenant isolation via `companyId`

3. **📋 Projects** (`projects`) - 0 records
   - Project management with budgets and client information
   - Key fields: `id`, `name`, `description`, `companyId`, `hourlyRate`, `budget`, `clientName`, `clientEmail`
   - Support for public/private projects and active/inactive status

4. **👥 Project Members** (`project_members`) - 0 records
   - Many-to-many relationship between users and projects
   - Roles: `ADMIN`, `MEMBER` (ProjectRole enum)
   - Key fields: `id`, `userId`, `projectId`, `role`, `joinedAt`

5. **⏱️ Time Entries** (`time_entries`) - 0 records
   - Core time tracking with billable hours and duration tracking
   - Key fields: `id`, `userId`, `projectId`, `companyId`, `startTime`, `endTime`, `duration`, `isBillable`, `hourlyRate`, `isRunning`
   - Support for tags, location, and manual vs automatic tracking

6. **📊 Reports** (`reports`) - 0 records
   - Flexible reporting system with multiple report types
   - Types: `TIME_SUMMARY`, `PROJECT_SUMMARY`, `USER_SUMMARY`, `DETAILED`, `INVOICE` (ReportType enum)
   - Key fields: `id`, `name`, `companyId`, `type`, `filters`, `data`, `createdById`

7. **✉️ Invitations** (`invitations`) - 0 records
   - User invitation system with expiration and token management
   - Status: `PENDING`, `ACCEPTED`, `EXPIRED`, `CANCELLED` (InvitationStatus enum)
   - Key fields: `id`, `email`, `companyId`, `role`, `status`, `token`, `expiresAt`

#### 🛠️ **Database Development Workflow**

**For Schema Changes:**

```bash
# 1. Create development branch for testing
mcp_supabasechron_create_branch(branch_name: "feature-new-schema")

# 2. Apply migration safely
mcp_supabasechron_apply_migration(name: "add_new_table", query: "CREATE TABLE...")

# 3. Generate updated TypeScript types
mcp_supabasechron_generate_typescript_types()

# 4. Test and validate changes, then merge
mcp_supabasechron_merge_branch(branch_id: "branch-id")
```

**For Data Analysis & Debugging:**

```sql
-- Check company data distribution
mcp_supabasechron_execute_sql("SELECT companyId, COUNT(*) FROM users GROUP BY companyId")

-- Analyze time tracking patterns
mcp_supabasechron_execute_sql("SELECT DATE(startTime), SUM(duration) FROM time_entries WHERE companyId = 'company-id' GROUP BY DATE(startTime)")

-- Check for orphaned records
mcp_supabasechron_execute_sql("SELECT * FROM time_entries WHERE projectId IS NULL")
```

**For Performance Monitoring:**

```bash
# Check for security issues (especially RLS policies)
mcp_supabasechron_get_advisors(type: "security")

# Monitor database performance
mcp_supabasechron_get_advisors(type: "performance")

# Check recent database activity
mcp_supabasechron_get_logs(service: "postgres")
```

#### 🔐 **Multi-tenant Security Patterns**

```typescript
// Always include company isolation in services
@Injectable()
export class TimeTrackingService {
  async findTimeEntries(companyId: string, userId?: string): Promise<TimeEntry[]> {
    // ALWAYS filter by companyId first
    return this.prisma.timeEntry.findMany({
      where: {
        companyId, // Multi-tenant isolation
        ...(userId && { userId }), // Optional user filter
      },
    });
  }
}

// Use RLS policies in database (check with advisors)
-- Example RLS policy for companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_isolation ON companies USING (id = current_setting('app.current_company_id'));
```

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
3. **Database changes**: Use Supabase branch workflow with migrations
4. **Add authentication**: Implement guards and protect routes
5. **Add validation**: Use class-validator decorators on DTOs
6. **Write tests**: Create unit and integration tests following patterns
7. **Debug issues**: Use Supabase logs and advisors for database issues
8. **Performance optimization**: Use Supabase advisors to identify bottlenecks
9. **Multi-tenant data analysis**: Query across companies safely
10. **Generate TypeScript types**: Update types after schema changes

### 🔄 **Database Development Workflows**

**Adding New Features with Database Changes:**

```bash
# 1. Create development branch
mcp_supabasechron_create_branch(branch_name: "feature-leave-management")

# 2. Develop and test locally with PrismaService
# 3. Apply migrations to development branch
mcp_supabasechron_apply_migration(name: "add_leave_tables", query: "CREATE TABLE leaves...")

# 4. Generate updated types
mcp_supabasechron_generate_typescript_types()

# 5. Update NestJS services and controllers
# 6. Run tests against development branch
# 7. Merge to production when ready
mcp_supabasechron_merge_branch(branch_id: "dev-branch-id")
```

**Debugging Production Issues:**

```bash
# Check recent API logs
mcp_supabasechron_get_logs(service: "api")

# Check database performance
mcp_supabasechron_get_advisors(type: "performance")

# Check security issues (missing RLS policies)
mcp_supabasechron_get_advisors(type: "security")

# Query specific data issues
mcp_supabasechron_execute_sql("SELECT * FROM companies WHERE...")
```

**Regular Maintenance Tasks:**

```bash
# Weekly security check
mcp_supabasechron_get_advisors(type: "security")

# Monthly performance review
mcp_supabasechron_get_advisors(type: "performance")

# Clean up old development branches
mcp_supabasechron_list_branches() → mcp_supabasechron_delete_branch()

# Update TypeScript types after schema changes
mcp_supabasechron_generate_typescript_types()
```

## 💡 Tips for AI Assistants

- **Always consider multi-tenancy**: Ensure company data isolation in all queries and operations
- **Use Supabase tools first**: Before writing complex code, check if Supabase MCP tools can help
- **Follow the established patterns**: Use existing code as examples, especially PrismaService integration
- **Prefer Supabase branch workflow**: Use development branches for schema changes instead of direct production changes
- **Test your code**: Write tests for new functionality and use development branches for testing
- **Check security regularly**: Use Supabase advisors to identify missing RLS policies and security issues
- **Monitor performance**: Use Supabase advisors and logs to identify performance bottlenecks
- **Generate types after changes**: Always run `generate_typescript_types` after schema modifications
- **Use proper error handling**: Log errors and use Supabase logs for debugging production issues
- **Follow NestJS conventions**: Use decorators, modules, and dependency injection properly
- **Leverage Prisma 7.0 features**: Use the new adapter pattern with connection pooling
- **Consider Edge Functions**: For serverless operations that don't fit in the main API

### 🚀 **Supabase-Specific Best Practices**

- **Development Workflow**: Always use branches for schema changes
- **Security First**: Run security advisors after any schema changes
- **Performance Monitoring**: Regular performance advisor checks
- **Multi-tenant Queries**: Always include `companyId` filters
- **Type Safety**: Regenerate TypeScript types after database changes
- **Edge Functions**: Consider for background jobs and webhooks
- **Logging**: Use Supabase logs for production debugging instead of console.log

---

## Issue Management & Linear Integration 🔄

### Automated Linear-GitHub Synchronization Workflow

#### 🚀 **When User Requests Issue Creation from Linear:**

**ALWAYS execute this complete workflow automatically:**

1. **📋 Scan Linear for new tickets:**
   - Find User Stories with specific tags ("frontend", etc.) in "Todo" status
   - Identify recently created tickets without GitHub issues

2. **⚡ Auto-create GitHub issues for each Linear ticket:**
   - Create main issue with format: `[US-ELE-X] <technical title>`
   - Generate 3-8 sub-issues based on technical complexity
   - Include detailed checklist, file paths, and acceptance criteria
   - Add appropriate labels (enhancement/bug, frontend/backend, feature area)
   - Auto-assign to repository owner

3. **🔗 Link Linear-GitHub bidirectionally:**
   - Add GitHub issue URLs as comments in Linear tickets
   - Include Linear ticket URL in every GitHub issue description
   - Document sub-issue relationships clearly

4. **📊 Update Linear ticket status automatically:**
   - Move tickets from "Todo" → "In Progress" when GitHub issues are created
   - Add confirmation comment with all GitHub issue links

#### 🔄 **GitHub-Linear Status Synchronization Rules**

- **When a main issue is closed:**
  - ✅ **Auto-close all related sub-issues** that reference the main issue
  - ✅ **Move corresponding Linear ticket to "Done"** status automatically
- **When a main issue moves to "In Review":**
  - ✅ **Move corresponding Linear ticket to "In Review"** status
- **Issue Status Mapping:**
  - GitHub "Open" + No Issues Created → Linear "Todo"
  - GitHub "Open" + Issues Created → Linear "In Progress"
  - GitHub "In Review" → Linear "In Review"
  - GitHub "Closed" → Linear "Done"

#### 📁 **Linear Ticket State Management**

- **Todo:** New tickets without GitHub issues (needs planning)
- **In Progress:** Tickets with GitHub issues created (ready for development)
- **In Review:** Active development/PR review in progress
- **Done:** All GitHub issues closed and verified

### Sub-issue Dependencies & Auto-Closure

- Sub-issues should reference parent issue with "Related to: #[main-issue-number]"
- Closing main issue should trigger automated closure of all sub-issues
- Sub-issue completion should update progress on main issue

### Best Practices for Issue Management

- Always link GitHub issues to Linear User Stories with URL in issue description
- Use consistent naming format: `[US-ELE-X] <technical title>`
- Include Linear ticket URL in every GitHub issue for bidirectional linking
- **AUTOMATICALLY** update Linear status when GitHub issue status changes
- Ensure all sub-issues are properly linked to main issue for automated closure
- **ALWAYS** move Linear tickets to "In Progress" after creating GitHub issues

### 🤖 **Common Automation Triggers**

#### **"Synchronize with GitHub" or "Sync new Linear tickets"**

→ **Execute full workflow:** Scan Linear → Create GitHub issues → Move to "In Progress" → Add linking comments

#### **"Close issues #X" or similar**

→ **Execute closure workflow:** Close main issue → Close sub-issues → Move Linear to "Done" → Add completion comment

#### **"New tickets created" or "Check Linear for updates"**

→ **Execute discovery workflow:** Find new tickets → Create issues → Update statuses → Confirm linking

#### **"Move completed tickets" or "Update Linear status"**

→ **Execute status sync:** Check GitHub statuses → Update Linear accordingly → Maintain consistency

---

_This document should be updated as the project evolves and new patterns are established._
