#!/bin/bash

###############################################################################
# Chronos API - Authentication Testing with cURL
###############################################################################
# This script contains curl commands to test the authentication endpoints
# Make the script executable: chmod +x auth-curl.sh
# Usage: ./auth-curl.sh
###############################################################################

# Configuration
BASE_URL="http://localhost:3001/api"
CONTENT_TYPE="application/json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "###############################################################################"
echo "# Chronos API - Authentication Testing"
echo "###############################################################################"
echo ""

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "\n${YELLOW}=== $1 ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

###############################################################################
# 1. REGISTER NEW USER
###############################################################################

print_header "1. Register New User"
echo "Replace 'replace-with-actual-company-id' with a real company ID from your database"
echo ""
echo "curl -X POST $BASE_URL/auth/register \\"
echo "  -H \"Content-Type: $CONTENT_TYPE\" \\"
echo "  -d '{"
echo "    \"email\": \"john.doe@example.com\","
echo "    \"password\": \"SecurePassword123!\","
echo "    \"firstName\": \"John\","
echo "    \"lastName\": \"Doe\","
echo "    \"companyId\": \"replace-with-actual-company-id\""
echo "  }'"
echo ""

# Uncomment to execute:
# curl -X POST "$BASE_URL/auth/register" \
#   -H "Content-Type: $CONTENT_TYPE" \
#   -d '{
#     "email": "john.doe@example.com",
#     "password": "SecurePassword123!",
#     "firstName": "John",
#     "lastName": "Doe",
#     "companyId": "replace-with-actual-company-id"
#   }'

###############################################################################
# 2. LOGIN WITH EXISTING USER
###############################################################################

print_header "2. Login with Existing User"
echo "curl -X POST $BASE_URL/auth/login \\"
echo "  -H \"Content-Type: $CONTENT_TYPE\" \\"
echo "  -d '{"
echo "    \"email\": \"john.doe@example.com\","
echo "    \"password\": \"SecurePassword123!\""
echo "  }'"
echo ""

# Example to execute and save token:
# RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
#   -H "Content-Type: $CONTENT_TYPE" \
#   -d '{
#     "email": "john.doe@example.com",
#     "password": "SecurePassword123!"
#   }')
# TOKEN=$(echo $RESPONSE | jq -r '.accessToken')
# echo "Token: $TOKEN"

###############################################################################
# 3. GET USER PROFILE (Protected Route)
###############################################################################

print_header "3. Get User Profile (Protected)"
echo "Replace 'YOUR_JWT_TOKEN_HERE' with the actual token from login/register response"
echo ""
echo "curl -X GET $BASE_URL/auth/profile \\"
echo "  -H \"Authorization: Bearer YOUR_JWT_TOKEN_HERE\""
echo ""

# Uncomment to execute (make sure TOKEN variable is set):
# curl -X GET "$BASE_URL/auth/profile" \
#   -H "Authorization: Bearer $TOKEN"

###############################################################################
# 4. ERROR SCENARIOS
###############################################################################

print_header "4.1. Register with Existing Email (409 Conflict)"
echo "curl -X POST $BASE_URL/auth/register \\"
echo "  -H \"Content-Type: $CONTENT_TYPE\" \\"
echo "  -d '{"
echo "    \"email\": \"john.doe@example.com\","
echo "    \"password\": \"SecurePassword123!\","
echo "    \"firstName\": \"John\","
echo "    \"lastName\": \"Doe\","
echo "    \"companyId\": \"replace-with-actual-company-id\""
echo "  }'"
echo ""

print_header "4.2. Login with Wrong Password (401 Unauthorized)"
echo "curl -X POST $BASE_URL/auth/login \\"
echo "  -H \"Content-Type: $CONTENT_TYPE\" \\"
echo "  -d '{"
echo "    \"email\": \"john.doe@example.com\","
echo "    \"password\": \"WrongPassword123!\""
echo "  }'"
echo ""

print_header "4.3. Login with Non-existent User (401 Unauthorized)"
echo "curl -X POST $BASE_URL/auth/login \\"
echo "  -H \"Content-Type: $CONTENT_TYPE\" \\"
echo "  -d '{"
echo "    \"email\": \"nonexistent@example.com\","
echo "    \"password\": \"SomePassword123!\""
echo "  }'"
echo ""

print_header "4.4. Get Profile without Token (401 Unauthorized)"
echo "curl -X GET $BASE_URL/auth/profile"
echo ""

print_header "4.5. Get Profile with Invalid Token (401 Unauthorized)"
echo "curl -X GET $BASE_URL/auth/profile \\"
echo "  -H \"Authorization: Bearer invalid-token-here\""
echo ""

print_header "4.6. Register with Invalid Email (400 Bad Request)"
echo "curl -X POST $BASE_URL/auth/register \\"
echo "  -H \"Content-Type: $CONTENT_TYPE\" \\"
echo "  -d '{"
echo "    \"email\": \"invalid-email\","
echo "    \"password\": \"SecurePassword123!\","
echo "    \"firstName\": \"John\","
echo "    \"lastName\": \"Doe\","
echo "    \"companyId\": \"replace-with-actual-company-id\""
echo "  }'"
echo ""

print_header "4.7. Register with Short Password (400 Bad Request)"
echo "curl -X POST $BASE_URL/auth/register \\"
echo "  -H \"Content-Type: $CONTENT_TYPE\" \\"
echo "  -d '{"
echo "    \"email\": \"newuser@example.com\","
echo "    \"password\": \"short\","
echo "    \"firstName\": \"John\","
echo "    \"lastName\": \"Doe\","
echo "    \"companyId\": \"replace-with-actual-company-id\""
echo "  }'"
echo ""

###############################################################################
# 5. COMPLETE WORKFLOW EXAMPLE
###############################################################################

print_header "5. Complete Workflow Example"
echo "This example shows a complete registration -> login -> profile flow"
echo ""

workflow_example() {
    local COMPANY_ID="${1:-replace-with-actual-company-id}"
    
    echo "Step 1: Register a new user"
    REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
        -H "Content-Type: $CONTENT_TYPE" \
        -d "{
            \"email\": \"workflow.test@example.com\",
            \"password\": \"WorkflowPassword123!\",
            \"firstName\": \"Workflow\",
            \"lastName\": \"Test\",
            \"companyId\": \"$COMPANY_ID\"
        }")
    
    echo "Register Response:"
    echo "$REGISTER_RESPONSE" | jq '.'
    
    # Extract token
    TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken')
    
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        print_success "Registration successful!"
        
        echo ""
        echo "Step 2: Get user profile with token"
        PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/profile" \
            -H "Authorization: Bearer $TOKEN")
        
        echo "Profile Response:"
        echo "$PROFILE_RESPONSE" | jq '.'
        print_success "Profile retrieval successful!"
    else
        print_error "Registration failed!"
    fi
}

# Uncomment to run the workflow:
# echo "To run the workflow, uncomment the line below and provide a company ID"
# workflow_example "your-company-id-here"

###############################################################################
# 6. QUICK TEST FUNCTIONS
###############################################################################

# Function to test registration
test_register() {
    local EMAIL="$1"
    local PASSWORD="$2"
    local FIRST_NAME="$3"
    local LAST_NAME="$4"
    local COMPANY_ID="$5"
    
    curl -s -X POST "$BASE_URL/auth/register" \
        -H "Content-Type: $CONTENT_TYPE" \
        -d "{
            \"email\": \"$EMAIL\",
            \"password\": \"$PASSWORD\",
            \"firstName\": \"$FIRST_NAME\",
            \"lastName\": \"$LAST_NAME\",
            \"companyId\": \"$COMPANY_ID\"
        }" | jq '.'
}

# Function to test login
test_login() {
    local EMAIL="$1"
    local PASSWORD="$2"
    
    curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: $CONTENT_TYPE" \
        -d "{
            \"email\": \"$EMAIL\",
            \"password\": \"$PASSWORD\"
        }" | jq '.'
}

# Function to test profile
test_profile() {
    local TOKEN="$1"
    
    curl -s -X GET "$BASE_URL/auth/profile" \
        -H "Authorization: Bearer $TOKEN" | jq '.'
}

###############################################################################
# USAGE EXAMPLES
###############################################################################

print_header "Usage Examples"
echo "# Register a user:"
echo "test_register \"user@example.com\" \"Password123!\" \"John\" \"Doe\" \"company-id\""
echo ""
echo "# Login:"
echo "test_login \"user@example.com\" \"Password123!\""
echo ""
echo "# Get profile:"
echo "test_profile \"your-jwt-token-here\""
echo ""

###############################################################################
# INTERACTIVE MODE
###############################################################################

interactive_mode() {
    while true; do
        echo ""
        echo "=== Chronos API Auth Testing - Interactive Mode ==="
        echo "1. Register new user"
        echo "2. Login"
        echo "3. Get profile"
        echo "4. Exit"
        echo -n "Choose an option: "
        read choice
        
        case $choice in
            1)
                echo -n "Email: "
                read email
                echo -n "Password: "
                read -s password
                echo ""
                echo -n "First Name: "
                read firstname
                echo -n "Last Name: "
                read lastname
                echo -n "Company ID: "
                read companyid
                test_register "$email" "$password" "$firstname" "$lastname" "$companyid"
                ;;
            2)
                echo -n "Email: "
                read email
                echo -n "Password: "
                read -s password
                echo ""
                RESPONSE=$(test_login "$email" "$password")
                echo "$RESPONSE"
                TOKEN=$(echo "$RESPONSE" | jq -r '.accessToken')
                if [ "$TOKEN" != "null" ]; then
                    echo -e "\n${GREEN}Token saved for profile access${NC}"
                fi
                ;;
            3)
                if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
                    echo -n "JWT Token: "
                    read token
                    test_profile "$token"
                else
                    test_profile "$TOKEN"
                fi
                ;;
            4)
                echo "Goodbye!"
                exit 0
                ;;
            *)
                echo "Invalid option"
                ;;
        esac
    done
}

# Uncomment to run interactive mode:
# interactive_mode

###############################################################################
echo ""
echo "Script loaded successfully!"
echo "Uncomment the examples above to execute them."
echo "Or source this file and use the helper functions:"
echo "  source auth-curl.sh"
echo "  test_register \"email@example.com\" \"Password123!\" \"First\" \"Last\" \"company-id\""
echo "###############################################################################"
