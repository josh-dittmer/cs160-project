#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory (backend/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  CS160 Backend Setup & Run Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please create backend/.env with the following required variables:${NC}"
    echo "  - GOOGLE_REDIRECT_URI=your-google-redirect-uri"
    echo "  - GOOGLE_CLIENT_ID=your-google-client-id"
    echo "  - GOOGLE_CLIENT_SECRET=your-google-client-secret"
    echo "  - GEMINI_API_KEY=your-gemini-api-key"
    echo "  - STRIPE_API_KEY=your-stripe-api-key"
    echo ""
    echo -e "${RED}Cannot continue without .env file. Exiting...${NC}"
    exit 1
fi

echo -e "${GREEN}✓ .env file found${NC}"
echo ""

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed. Please install Python 3.8+ first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python 3 found: $(python3 --version)${NC}"
echo ""

# Check for old root .venv and auto-delete
if [ -d "../.venv" ]; then
    echo -e "${YELLOW}⚠️  Found old .venv in project root. Removing it...${NC}"
    rm -rf ../.venv
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Removed old .venv. This project now uses backend/.venv${NC}"
    else
        echo -e "${RED}❌ Failed to remove old .venv. Please delete it manually:${NC}"
        echo "  cd .."
        echo "  rm -rf .venv"
        echo "  cd backend"
        echo "  ./run_backend.sh"
        exit 1
    fi
    echo ""
fi

# Step 1: Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}📦 Virtual environment not found. Creating .venv...${NC}"
    python3 -m venv .venv
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Virtual environment created successfully${NC}"
    else
        echo -e "${RED}❌ Failed to create virtual environment${NC}"
        exit 1
    fi
    echo ""
else
    echo -e "${GREEN}✓ Virtual environment already exists${NC}"
    echo ""
fi

# Step 2: Activate virtual environment
echo -e "${BLUE}🔌 Activating virtual environment...${NC}"
source .venv/bin/activate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
else
    echo -e "${RED}❌ Failed to activate virtual environment${NC}"
    exit 1
fi
echo ""

# Step 3: Install/update dependencies
echo -e "${BLUE}📦 Installing/updating dependencies from requirements.txt...${NC}"
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies ready${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi
echo ""

# Step 4: Ask about database seeding
echo -e "${YELLOW}🗄️  Database Seeding${NC}"
echo "The seed script will:"
echo "  - Automatically delete sqlite.db if it exists"
echo "  - Create a fresh database with sample data"
echo "  - Create admin user: admin@sjsu.edu / admin123"
echo ""
read -p "Run database seed script? (y/n): " seed_choice
echo ""

if [[ $seed_choice =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🌱 Seeding database...${NC}"
    python -m app.seed
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database seeded successfully${NC}"
        echo -e "${GREEN}  Admin login: admin@sjsu.edu / admin123${NC}"
    else
        echo -e "${RED}❌ Failed to seed database${NC}"
        read -p "Continue anyway? (y/n): " continue_anyway
        if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
            echo -e "${RED}Exiting...${NC}"
            exit 1
        fi
    fi
    echo ""
fi

# Step 5: Ask about robot simulation
RUN_ROBOT=false
ROBOT_PID=""

echo -e "${YELLOW}🤖 Robot Simulation${NC}"
echo "The robot simulation will:"
echo "  - Run in the background alongside the backend server"
echo "  - Process queued orders automatically"
echo "  - Change order status from queued to shipped"
echo "  - Trigger route optimization"
echo ""
read -p "Run robot simulation? (y/n): " robot_choice
echo ""

if [[ $robot_choice =~ ^[Yy]$ ]]; then
    # Check if keys.json exists
    if [ ! -f "keys.json" ]; then
        echo -e "${RED}❌ Error: keys.json not found!${NC}"
        echo -e "${YELLOW}Robot simulation requires Google service account credentials.${NC}"
        echo "Contact a team member for the keys.json file."
        echo ""
        echo -e "${RED}Cannot run robot simulation without keys.json. Exiting...${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ keys.json found${NC}"
    RUN_ROBOT=true
    echo ""
fi

# Setup cleanup function to stop both server and robot
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    
    # Kill robot simulation if running
    if [ ! -z "$ROBOT_PID" ]; then
        echo -e "${YELLOW}Stopping robot simulation (PID: $ROBOT_PID)${NC}"
        kill $ROBOT_PID 2>/dev/null
        wait $ROBOT_PID 2>/dev/null
    fi
    
    # Kill uvicorn server
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "${YELLOW}Stopping backend server (PID: $SERVER_PID)${NC}"
        kill $SERVER_PID 2>/dev/null
        wait $SERVER_PID 2>/dev/null
    fi
    
    echo -e "${GREEN}✓ All processes stopped${NC}"
    deactivate
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup SIGINT SIGTERM

# Step 6: Start the backend server
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}🚀 Starting Backend Server...${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${GREEN}Backend will be available at: http://localhost:8080${NC}"
echo -e "${GREEN}Health check: http://localhost:8080/healthz${NC}"
echo -e "${GREEN}API docs: http://localhost:8080/docs${NC}"
echo ""

# Start robot simulation if requested
if [ "$RUN_ROBOT" = true ]; then
    echo -e "${BLUE}🤖 Starting robot simulation in background...${NC}"
    python -m app.robot.main &
    ROBOT_PID=$!
    echo -e "${GREEN}✓ Robot simulation started (PID: $ROBOT_PID)${NC}"
    echo ""
fi

echo -e "${YELLOW}Press Ctrl+C to stop all processes${NC}"
echo ""

# Run the server in the foreground
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080 &
SERVER_PID=$!

# Wait for the server process
wait $SERVER_PID

# If server stops naturally, clean up
cleanup

