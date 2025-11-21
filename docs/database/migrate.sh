#!/bin/bash
# ===========================================================================
# Database Migration Script for Chronos Time Tracking System
# ===========================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default database configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-chronos_db}
DB_USER=${DB_USER:-chronos_user}
DB_PASSWORD=${DB_PASSWORD:-chronos_password}

echo -e "${BLUE}Chronos Database Migration Script${NC}"
echo "=================================="

# Function to check if PostgreSQL is running
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
    if ! pg_isready -h $DB_HOST -p $DB_PORT -d postgres > /dev/null 2>&1; then
        echo -e "${RED}Error: Cannot connect to PostgreSQL server at $DB_HOST:$DB_PORT${NC}"
        echo "Please ensure PostgreSQL is running and accessible."
        exit 1
    fi
    echo -e "${GREEN}PostgreSQL is running${NC}"
}

# Function to create database if it doesn't exist
create_database() {
    echo -e "${YELLOW}Creating database if not exists...${NC}"
    
    # Check if database exists
    DB_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U postgres -t -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 && echo "yes" || echo "no")
    
    if [ "$DB_EXISTS" = "no" ]; then
        echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME;"
        echo -e "${GREEN}Database '$DB_NAME' created successfully${NC}"
    else
        echo -e "${YELLOW}Database '$DB_NAME' already exists${NC}"
    fi
}

# Function to create user if it doesn't exist
create_user() {
    echo -e "${YELLOW}Creating database user if not exists...${NC}"
    
    # Check if user exists
    USER_EXISTS=$(psql -h $DB_HOST -p $DB_PORT -U postgres -t -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 && echo "yes" || echo "no")
    
    if [ "$USER_EXISTS" = "no" ]; then
        echo -e "${YELLOW}Creating user '$DB_USER'...${NC}"
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        echo -e "${GREEN}User '$DB_USER' created successfully${NC}"
    else
        echo -e "${YELLOW}User '$DB_USER' already exists${NC}"
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    fi
}

# Function to run schema migration
run_schema() {
    echo -e "${YELLOW}Running schema migration...${NC}"
    
    if [ ! -f "schema.sql" ]; then
        echo -e "${RED}Error: schema.sql file not found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Applying schema to database...${NC}"
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Schema applied successfully${NC}"
    else
        echo -e "${RED}Error applying schema${NC}"
        exit 1
    fi
}

# Function to insert sample data
insert_sample_data() {
    echo -e "${YELLOW}Would you like to insert sample data? (y/n)${NC}"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        if [ ! -f "sample-data.sql" ]; then
            echo -e "${RED}Error: sample-data.sql file not found${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}Inserting sample data...${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f sample-data.sql
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Sample data inserted successfully${NC}"
        else
            echo -e "${RED}Error inserting sample data${NC}"
            exit 1
        fi
    else
        echo -e "${YELLOW}Skipping sample data insertion${NC}"
    fi
}

# Function to verify installation
verify_installation() {
    echo -e "${YELLOW}Verifying installation...${NC}"
    
    # Count tables
    TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo -e "${GREEN}Tables created: $TABLE_COUNT${NC}"
    
    # Check if sample data was inserted
    USER_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;")
    echo -e "${GREEN}Users in database: $USER_COUNT${NC}"
    
    echo -e "${GREEN}Database setup completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Connection details:${NC}"
    echo "Host: $DB_HOST"
    echo "Port: $DB_PORT"
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo ""
    echo -e "${BLUE}You can connect using:${NC}"
    echo "psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  --host HOST         PostgreSQL host (default: localhost)"
    echo "  --port PORT         PostgreSQL port (default: 5432)"
    echo "  --dbname NAME       Database name (default: chronos_db)"
    echo "  --user USER         Database user (default: chronos_user)"
    echo "  --password PASS     Database password (default: chronos_password)"
    echo "  --schema-only       Only create schema, skip sample data"
    echo "  --reset             Drop and recreate database"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
}

# Function to reset database
reset_database() {
    echo -e "${RED}WARNING: This will drop and recreate the database!${NC}"
    echo -e "${RED}All data will be lost. Are you sure? (type 'yes' to continue)${NC}"
    read -r response
    
    if [ "$response" = "yes" ]; then
        echo -e "${YELLOW}Dropping database...${NC}"
        psql -h $DB_HOST -p $DB_PORT -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}Database dropped${NC}"
    else
        echo -e "${YELLOW}Reset cancelled${NC}"
        exit 0
    fi
}

# Parse command line arguments
SCHEMA_ONLY=false
RESET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --host)
            DB_HOST="$2"
            shift 2
            ;;
        --port)
            DB_PORT="$2"
            shift 2
            ;;
        --dbname)
            DB_NAME="$2"
            shift 2
            ;;
        --user)
            DB_USER="$2"
            shift 2
            ;;
        --password)
            DB_PASSWORD="$2"
            shift 2
            ;;
        --schema-only)
            SCHEMA_ONLY=true
            shift
            ;;
        --reset)
            RESET=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    echo -e "${BLUE}Starting database migration...${NC}"
    echo "Host: $DB_HOST"
    echo "Port: $DB_PORT" 
    echo "Database: $DB_NAME"
    echo "User: $DB_USER"
    echo ""
    
    check_postgres
    
    if [ "$RESET" = true ]; then
        reset_database
    fi
    
    create_database
    create_user
    run_schema
    
    if [ "$SCHEMA_ONLY" = false ]; then
        insert_sample_data
    fi
    
    verify_installation
    
    echo -e "${GREEN}Migration completed successfully!${NC}"
}

# Check if we're in the right directory
if [ ! -f "schema.sql" ]; then
    echo -e "${RED}Error: Please run this script from the database directory containing schema.sql${NC}"
    exit 1
fi

# Run main function
main