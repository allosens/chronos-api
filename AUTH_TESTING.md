# Authentication Testing Guide

This directory contains files to help you test the Chronos API authentication and authorization system.

## 📁 Testing Files

- **`auth.http`** - REST Client format for VS Code REST Client extension
- **`auth-curl.sh`** - Shell script with curl commands for command-line testing

## 🚀 Quick Start

### Prerequisites

1. **Start the API server:**
   ```bash
   pnpm run dev
   ```
   The API should be running on `http://localhost:3001`

2. **Create a company in the database** (required before registering users):
   ```sql
   INSERT INTO companies (id, name, slug, email, timezone)
   VALUES ('test-company-id', 'Test Company', 'test-company', 'test@company.com', 'UTC');
   ```

## 🔧 Option 1: Using REST Client (VS Code)

### Installation

1. Install the [REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) in VS Code
2. Open the `auth.http` file
3. Click "Send Request" above any request

### Features

- ✅ Syntax highlighting
- ✅ Variable support
- ✅ Response preview
- ✅ History tracking
- ✅ Chain requests (use response from previous request)

### Basic Usage

1. **Update the company ID** in the requests:
   ```http
   "companyId": "test-company-id"  # Replace with your actual company ID
   ```

2. **Register a new user:**
   - Find the "1. REGISTER NEW USER" section
   - Click "Send Request" above the POST line

3. **Login:**
   - Find the "2. LOGIN WITH EXISTING USER" section
   - Click "Send Request"

4. **Get profile:**
   - Copy the `accessToken` from the login response
   - Replace `@authToken` value with your token
   - Click "Send Request" in the profile section

### Workflow Example

The file includes a workflow that chains requests:
```http
### Step 1: Register a new user
# @name registerUser
POST {{baseUrl}}/auth/register
...

### Step 2: Use token from previous response
GET {{baseUrl}}/auth/profile
Authorization: Bearer {{registerUser.response.body.accessToken}}
```

## 🖥️ Option 2: Using curl (Command Line)

### Basic Commands

```bash
# Make the script executable (first time only)
chmod +x auth-curl.sh

# View all available commands
./auth-curl.sh

# Or source it to use helper functions
source auth-curl.sh
```

### Helper Functions

The script provides convenient functions:

```bash
# Register a user
test_register "user@example.com" "Password123!" "John" "Doe" "company-id"

# Login
test_login "user@example.com" "Password123!"

# Get profile (with token)
test_profile "your-jwt-token-here"
```

### Interactive Mode

Run the script in interactive mode for step-by-step testing:

```bash
# Uncomment the last line in auth-curl.sh, then run:
./auth-curl.sh
```

This will present a menu:
```
1. Register new user
2. Login
3. Get profile
4. Exit
```

### Complete Workflow Example

```bash
# Source the script
source auth-curl.sh

# 1. Register
REGISTER_RESPONSE=$(test_register "test@example.com" "Password123!" "Test" "User" "test-company-id")
echo $REGISTER_RESPONSE | jq '.'

# 2. Extract token
TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.accessToken')

# 3. Get profile
test_profile "$TOKEN"
```

## 📝 Example Requests

### 1. Register New User

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "companyId": "test-company-id"
  }'
```

**Expected Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx...",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "companyId": "test-company-id"
  }
}
```

### 2. Login

**Request:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePassword123!"
  }'
```

**Expected Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx...",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "EMPLOYEE",
    "companyId": "test-company-id"
  }
}
```

### 3. Get Profile (Protected)

**Request:**
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "id": "clx...",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "EMPLOYEE",
  "companyId": "test-company-id"
}
```

## 🧪 Test Scenarios

The files include comprehensive test scenarios:

### Success Cases
- ✅ Register new user with valid data
- ✅ Login with correct credentials
- ✅ Access protected route with valid JWT token

### Error Cases
- ❌ Register with existing email → 409 Conflict
- ❌ Register with invalid company → 409 Conflict
- ❌ Login with wrong password → 401 Unauthorized
- ❌ Login with non-existent user → 401 Unauthorized
- ❌ Access protected route without token → 401 Unauthorized
- ❌ Access protected route with invalid token → 401 Unauthorized
- ❌ Register with invalid email format → 400 Bad Request
- ❌ Register with short password (< 8 chars) → 400 Bad Request

## 🔐 JWT Token Structure

The JWT tokens contain the following payload:

```json
{
  "sub": "user-id",
  "email": "user@example.com",
  "role": "EMPLOYEE",
  "companyId": "company-id",
  "iat": 1700000000,
  "exp": 1700604800
}
```

You can decode tokens at [jwt.io](https://jwt.io/) to inspect the payload.

## 🏢 Multi-Tenant Testing

To test multi-tenant isolation:

1. **Create two companies:**
   ```sql
   INSERT INTO companies (id, name, slug) VALUES 
     ('company-a', 'Company A', 'company-a'),
     ('company-b', 'Company B', 'company-b');
   ```

2. **Register users for each company:**
   ```bash
   # User for Company A
   test_register "usera@example.com" "Password123!" "User" "A" "company-a"
   
   # User for Company B
   test_register "userb@example.com" "Password123!" "User" "B" "company-b"
   ```

3. **Verify isolation:**
   - Login with each user
   - Check that JWT tokens have different `companyId` values
   - Protected endpoints should only return data for the user's company

## 👥 Role-Based Testing

Default role for new users is `EMPLOYEE`. To test other roles:

1. **Update user role in database:**
   ```sql
   UPDATE users 
   SET role = 'ADMIN' 
   WHERE email = 'admin@example.com';
   ```

2. **Login and verify JWT payload contains the updated role:**
   ```bash
   RESPONSE=$(test_login "admin@example.com" "Password123!")
   TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
   
   # Decode token to verify role
   echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.'
   ```

## 🔍 Debugging Tips

### Check if API is running
```bash
curl http://localhost:3001/api/health
```

### Pretty print JSON responses
```bash
curl http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}' | jq '.'
```

### View response headers
```bash
curl -i http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Enable verbose output
```bash
curl -v http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123!"}'
```

## 📚 Additional Resources

- [NestJS Authentication Documentation](https://docs.nestjs.com/security/authentication)
- [JWT.io - JWT Debugger](https://jwt.io/)
- [VS Code REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
- [jq - JSON processor](https://stedolan.github.io/jq/)

## 🐛 Troubleshooting

### "Connection refused"
- Make sure the API is running: `pnpm run dev`
- Check the port in `.env` (default: 3001)

### "409 Conflict - User already exists"
- The email is already registered
- Use a different email or delete the user from the database

### "409 Conflict - Company not found"
- The `companyId` doesn't exist in the database
- Create a company first or use an existing company ID

### "401 Unauthorized"
- Check if the password is correct
- Verify the JWT token is valid and not expired
- Ensure the `Authorization` header is properly formatted: `Bearer <token>`

### "400 Bad Request"
- Check the request payload format
- Verify email format is valid
- Ensure password is at least 8 characters

## 💡 Pro Tips

1. **Save tokens as environment variables:**
   ```bash
   export AUTH_TOKEN=$(test_login "user@example.com" "Password123!" | jq -r '.accessToken')
   test_profile "$AUTH_TOKEN"
   ```

2. **Create a test user script:**
   ```bash
   # create-test-user.sh
   source auth-curl.sh
   test_register "test@example.com" "TestPassword123!" "Test" "User" "test-company-id"
   ```

3. **Use `jq` for better output:**
   ```bash
   test_login "user@example.com" "Password123!" | jq -C '.' | less -R
   ```

4. **Chain multiple requests:**
   ```bash
   # Register, login, and get profile in one command
   TOKEN=$(test_register "new@example.com" "Password123!" "New" "User" "test-company-id" | jq -r '.accessToken')
   test_profile "$TOKEN"
   ```
