# Time Correction Request System API Documentation

## Overview

The Time Correction Request System allows employees to request modifications to their work session time entries (clock-in/clock-out times) and enables managers to review and approve/reject these requests. This ensures accurate time tracking while maintaining an audit trail of all changes.

## Features

- ✅ Submit correction requests for clock-in and clock-out times
- ✅ Track request status (pending, approved, rejected, cancelled)
- ✅ Manager/Admin approval workflow
- ✅ Comprehensive audit trail for all corrections
- ✅ Multi-tenant isolation and security
- ✅ Automatic work session updates upon approval
- ✅ Recalculation of total hours after corrections

## API Endpoints

### 1. Create Time Correction Request

**Endpoint**: `POST /api/v1/time-corrections`

**Authentication**: Required (JWT)

**Authorization**: All authenticated users can create corrections for their own work sessions

**Request Body**:
```json
{
  "workSessionId": "uuid-of-work-session",
  "requestedClockIn": "2024-01-15T08:30:00Z",  // Optional
  "requestedClockOut": "2024-01-15T17:30:00Z", // Optional
  "reason": "Forgot to clock in earlier"       // Required
}
```

**Response** (201 Created):
```json
{
  "id": "correction-request-uuid",
  "userId": "user-uuid",
  "companyId": "company-uuid",
  "workSessionId": "work-session-uuid",
  "originalClockIn": "2024-01-15T09:00:00Z",
  "originalClockOut": "2024-01-15T17:00:00Z",
  "requestedClockIn": "2024-01-15T08:30:00Z",
  "requestedClockOut": null,
  "reason": "Forgot to clock in earlier",
  "status": "PENDING",
  "createdAt": "2024-01-16T10:00:00Z",
  "reviewedAt": null,
  "reviewedBy": null,
  "reviewNotes": null,
  "user": {
    "id": "user-uuid",
    "email": "employee@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "reviewer": null,
  "workSession": {
    "id": "work-session-uuid",
    "date": "2024-01-15",
    "clockIn": "2024-01-15T09:00:00Z",
    "clockOut": "2024-01-15T17:00:00Z",
    "status": "CLOCKED_OUT"
  }
}
```

**Validation Rules**:
- At least one of `requestedClockIn` or `requestedClockOut` must be provided
- Work session must exist and belong to the user's company
- Employees can only create corrections for their own work sessions
- If both times provided, `requestedClockOut` must be after `requestedClockIn`

---

### 2. List Time Correction Requests

**Endpoint**: `GET /api/v1/time-corrections`

**Authentication**: Required (JWT)

**Authorization**: 
- Employees can only see their own requests
- Managers/Admins can see all requests in their company

**Query Parameters**:
```
?userId=uuid           // Filter by user (admin only)
?workSessionId=uuid    // Filter by work session
?status=PENDING        // Filter by status (PENDING, APPROVED, REJECTED, CANCELLED)
?startDate=2024-01-01  // Filter by creation date range
?endDate=2024-01-31
?limit=20              // Pagination limit (1-100)
?offset=0              // Pagination offset
```

**Response** (200 OK):
```json
{
  "requests": [
    {
      "id": "correction-request-uuid",
      "userId": "user-uuid",
      "status": "PENDING",
      "reason": "Forgot to clock in earlier",
      // ... full correction request object
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

---

### 3. Get Specific Time Correction Request

**Endpoint**: `GET /api/v1/time-corrections/:id`

**Authentication**: Required (JWT)

**Authorization**:
- Employees can only view their own requests
- Managers/Admins can view all requests in their company

**Response** (200 OK):
```json
{
  "id": "correction-request-uuid",
  // ... full correction request object with user, reviewer, and workSession relations
}
```

---

### 4. Update Time Correction Request

**Endpoint**: `PUT /api/v1/time-corrections/:id`

**Authentication**: Required (JWT)

**Authorization**: Only the requester can update their own pending requests

**Request Body**:
```json
{
  "requestedClockIn": "2024-01-15T08:00:00Z",  // Optional
  "requestedClockOut": "2024-01-15T17:30:00Z", // Optional
  "reason": "Updated reason"                    // Optional
}
```

**Response** (200 OK): Updated correction request object

**Validation Rules**:
- Can only update requests with status `PENDING`
- At least one time correction must remain after update

---

### 5. Cancel Time Correction Request

**Endpoint**: `DELETE /api/v1/time-corrections/:id`

**Authentication**: Required (JWT)

**Authorization**: Only the requester can cancel their own pending requests

**Response** (204 No Content)

**Validation Rules**:
- Can only cancel requests with status `PENDING`

---

### 6. Approve Time Correction Request

**Endpoint**: `POST /api/v1/time-corrections/:id/approve`

**Authentication**: Required (JWT)

**Authorization**: Only `COMPANY_ADMIN` or `SUPER_ADMIN` roles

**Request Body**:
```json
{
  "reviewNotes": "Approved - valid reason provided"  // Optional
}
```

**Response** (200 OK):
```json
{
  "id": "correction-request-uuid",
  "status": "APPROVED",
  "reviewedAt": "2024-01-16T14:00:00Z",
  "reviewedBy": "admin-uuid",
  "reviewNotes": "Approved - valid reason provided",
  // ... full correction request object
}
```

**Side Effects**:
- Updates the work session with the approved times
- Recalculates `totalHours` for the work session
- Creates audit log entries for both the correction request and work session modification

**Validation Rules**:
- Can only approve requests with status `PENDING`
- Cannot approve your own correction requests (self-approval prevention)

---

### 7. Reject Time Correction Request

**Endpoint**: `POST /api/v1/time-corrections/:id/reject`

**Authentication**: Required (JWT)

**Authorization**: Only `COMPANY_ADMIN` or `SUPER_ADMIN` roles

**Request Body**:
```json
{
  "reviewNotes": "Not enough justification provided"  // Required
}
```

**Response** (200 OK):
```json
{
  "id": "correction-request-uuid",
  "status": "REJECTED",
  "reviewedAt": "2024-01-16T14:00:00Z",
  "reviewedBy": "admin-uuid",
  "reviewNotes": "Not enough justification provided",
  // ... full correction request object
}
```

**Side Effects**:
- Creates audit log entry for the rejection
- Original work session remains unchanged

**Validation Rules**:
- Can only reject requests with status `PENDING`
- Review notes are required for rejection

---

### 8. Get Pending Approvals

**Endpoint**: `GET /api/v1/time-corrections/pending`

**Authentication**: Required (JWT)

**Authorization**: Only `COMPANY_ADMIN` or `SUPER_ADMIN` roles

**Response** (200 OK):
```json
{
  "requests": [
    {
      "id": "correction-request-uuid",
      "status": "PENDING",
      // ... full correction request objects
    }
  ],
  "total": 5,
  "limit": 5,
  "offset": 0
}
```

**Notes**:
- Returns all pending correction requests in the company
- Excludes the admin's own requests (cannot self-approve)
- Ordered by creation date (oldest first)

---

### 9. Get Correction History for Work Session

**Endpoint**: `GET /api/v1/work-sessions/:id/corrections`

**Authentication**: Required (JWT)

**Authorization**:
- Employees can only view history for their own work sessions
- Managers/Admins can view history for all work sessions in their company

**Response** (200 OK):
```json
{
  "requests": [
    {
      "id": "correction-request-uuid-1",
      "status": "APPROVED",
      "createdAt": "2024-01-16T10:00:00Z",
      // ... full correction request object
    },
    {
      "id": "correction-request-uuid-2",
      "status": "REJECTED",
      "createdAt": "2024-01-17T11:00:00Z",
      // ... full correction request object
    }
  ],
  "total": 2,
  "limit": 2,
  "offset": 0
}
```

**Notes**:
- Returns all correction requests for a specific work session
- Ordered by creation date (most recent first)
- Useful for viewing the complete correction history and audit trail

---

## Status Flow

```
PENDING → APPROVED   (Manager/Admin approval)
        → REJECTED   (Manager/Admin rejection)
        → CANCELLED  (Employee cancellation)
```

**Status Descriptions**:
- `PENDING`: Request submitted and awaiting review
- `APPROVED`: Request approved and work session updated
- `REJECTED`: Request rejected, work session unchanged
- `CANCELLED`: Request cancelled by the requester

---

## Audit Trail

All correction requests and their outcomes are logged in the `audit_logs` table:

**Events Logged**:
1. **Correction Request Created** - When employee submits a request
2. **Correction Request Updated** - When employee modifies a pending request
3. **Correction Request Approved** - When admin/manager approves
4. **Work Session Updated** - When approved corrections are applied
5. **Correction Request Rejected** - When admin/manager rejects
6. **Correction Request Cancelled** - When employee cancels

**Audit Log Structure**:
```json
{
  "userId": "user-uuid",
  "companyId": "company-uuid",
  "entityType": "TimeCorrectionRequest",
  "entityId": "correction-request-uuid",
  "action": "CREATED|UPDATED|APPROVED|REJECTED",
  "oldValues": { /* previous state */ },
  "newValues": { /* new state */ },
  "createdAt": "2024-01-16T10:00:00Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "At least one time correction (clockIn or clockOut) must be requested",
  "error": "Bad Request"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You can only create correction requests for your own work sessions",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Work session not found",
  "error": "Not Found"
}
```

---

## Security Considerations

1. **Multi-tenant Isolation**: All queries are filtered by `companyId` to prevent cross-company data access
2. **Role-Based Authorization**: Approval/rejection endpoints restricted to admin roles
3. **Self-Approval Prevention**: Managers cannot approve their own correction requests
4. **Ownership Validation**: Employees can only modify their own requests
5. **Audit Trail**: Complete immutable history of all corrections and approvals

---

## Example Workflow

### Scenario: Employee needs to correct clock-in time

1. **Employee submits correction request**:
   ```bash
   POST /api/v1/time-corrections
   {
     "workSessionId": "work-session-123",
     "requestedClockIn": "2024-01-15T08:30:00Z",
     "reason": "Forgot to clock in earlier, arrived at 8:30 AM"
   }
   ```

2. **Manager views pending approvals**:
   ```bash
   GET /api/v1/time-corrections/pending
   ```

3. **Manager reviews the request**:
   ```bash
   GET /api/v1/time-corrections/correction-123
   ```

4. **Manager approves the request**:
   ```bash
   POST /api/v1/time-corrections/correction-123/approve
   {
     "reviewNotes": "Valid reason, confirmed with security logs"
   }
   ```

5. **System automatically**:
   - Updates work session clock-in time to 08:30
   - Recalculates total hours
   - Creates audit log entries
   - Sets correction request status to APPROVED

6. **Employee can view history**:
   ```bash
   GET /api/v1/work-sessions/work-session-123/corrections
   ```

---

## Database Schema

The system uses the existing `time_correction_requests` table:

```sql
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
  review_notes TEXT
);
```

**Indexes**:
- `idx_time_correction_requests_user_id` - User's requests
- `idx_time_correction_requests_status` - Status filtering
- Company isolation via multi-tenant constraint

---

## Integration Notes

- Integrates with existing `work_sessions` table for time tracking
- Uses existing `audit_logs` table for audit trail
- Leverages existing `request_status` enum (PENDING, APPROVED, REJECTED, CANCELLED)
- Follows established NestJS patterns from `TimeTrackingService`
- Multi-tenant isolation enforced at database and application layers
