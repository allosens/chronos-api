# 📋 Chronos API - Requirements & Specifications

This document outlines the functional requirements for the Chronos Time Tracking API using behavior-driven development (BDD) scenarios.

## 🔐 1. Authentication & Authorization

### Feature: User Authentication

**Scenario: Login with valid credentials**

- **Given** a user is registered in Supabase Auth
- **When** they send valid credentials to the login endpoint
- **Then** the system generates a correct JWT token
- **And** the JWT contains the user's role and company_id

**Scenario: Access protected route without authentication**

- **Given** an unauthenticated user
- **When** they attempt to access a protected endpoint
- **Then** the backend responds with `401 Unauthorized`

**Scenario: Access with insufficient role permissions**

- **Given** an authenticated user with "user" role
- **When** they access an endpoint exclusive to "admin_company"
- **Then** the backend responds with `403 Forbidden`

---

## 👥 2. User Management (Admin & Super Admin)

### Feature: User Management

**Scenario: Create user assigned to a company**

- **Given** an authenticated admin_company user
- **When** they send valid data to create a user
- **Then** the system creates the user
- **And** associates them with the admin's company

**Scenario: Super Admin creates company and assigns admin**

- **Given** an authenticated super_admin user
- **When** they send valid data to create a company and its admin_company
- **Then** the backend creates the company
- **And** creates the associated admin user

---

## ⏰ 3. Time Tracking (Work Sessions)

### Feature: Clock-in/Clock-out System

**Scenario: Register clock-in**

- **Given** an authenticated user
- **When** they send a clock-in request without an open session
- **Then** the system creates a new work_session
- **And** clock_out remains null

**Scenario: Register clock-out**

- **Given** a user with an open session (clock_in without clock_out)
- **When** they send a clock-out request
- **Then** the backend updates the session
- **And** registers the clock_out time
- **And** calculates total_seconds

**Scenario: Prevent double clock-in without closing previous session**

- **Given** a user with an open session
- **When** they attempt to register a new clock-in
- **Then** the backend responds with `409 Conflict`

---

## 🔄 4. Time Correction Requests (Change Requests)

### Feature: Time tracking correction requests

**Scenario: Create correction request**

- **Given** an authenticated user
- **When** they send a request with modified values
- **Then** the backend creates a change_request with "pending" status

**Scenario: Admin approves correction**

- **Given** a request in "pending" status
- **And** an authenticated admin_company user
- **When** they approve the request
- **Then** the request status changes to "approved"
- **And** the system updates the affected work_session

**Scenario: Admin denies correction**

- **Given** a request in "pending" status
- **And** an authenticated admin_company user
- **When** they reject the request
- **Then** the request status changes to "denied"
- **And** the original work_session remains unchanged

---

## 🏖️ 5. Vacation / Absence Requests

### Feature: Absence request management

**Scenario: Create vacation request**

- **Given** an authenticated user
- **When** they send a valid request with a date range
- **Then** the backend creates an absence_request in "pending" status

**Scenario: Admin approves absence**

- **Given** an absence_request in "pending" status
- **And** an authenticated admin_company user
- **When** they approve the request
- **Then** the status changes to "approved"

**Scenario: Validate overlapping absences**

- **Given** a user with an approved absence in a date range
- **When** they create a new request that overlaps those dates
- **Then** the backend responds with `409 Conflict`

---

## 🏢 6. Multi-Tenant Security (RLS + App Authorization)

### Feature: Multi-tenant security

**Scenario: User attempts to access another company's data**

- **Given** an authenticated user with company_id X
- **When** they attempt to access a resource with company_id Y
- **Then** the backend responds with `403 Forbidden`

**Scenario: Super Admin accesses data from any company**

- **Given** an authenticated user with super_admin role
- **When** they access any multi-tenant resource
- **Then** the backend allows the operation

---

## 🎯 Implementation Guidelines

### Security Requirements

- All endpoints must validate JWT tokens
- Multi-tenant isolation must be enforced at the database level
- Row Level Security (RLS) policies must be implemented in Supabase
- Role-based access control must be implemented in NestJS guards

### Data Validation

- All input must be validated using DTOs with class-validator
- Business logic validation must be implemented in services
- Database constraints must prevent invalid data states

### Error Handling

- Use appropriate HTTP status codes
- Provide meaningful error messages
- Log security violations for monitoring

### Testing

- Unit tests for all services and business logic
- Integration tests for all API endpoints
- End-to-end tests for complete user workflows

---

## 📚 Related Documentation

- [Database Schema](../prisma/schema.prisma) - Complete database structure
- [API Documentation](../README.md) - Setup and development guide
- [Agent Instructions](../AGENTS.md) - Development patterns and guidelines
