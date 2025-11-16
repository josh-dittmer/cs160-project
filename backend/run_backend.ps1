# CS160 Backend Setup & Run Script for Windows PowerShell

# Set error action preference
$ErrorActionPreference = "Stop"

# Get script directory (backend/)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "======================================" -ForegroundColor Blue
Write-Host "  CS160 Backend Setup & Run Script" -ForegroundColor Blue
Write-Host "======================================" -ForegroundColor Blue
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please create backend\.env with the following required variables:" -ForegroundColor Yellow
    Write-Host "  - GOOGLE_REDIRECT_URI=your-google-redirect-uri"
    Write-Host "  - GOOGLE_CLIENT_ID=your-google-client-id"
    Write-Host "  - GOOGLE_CLIENT_SECRET=your-google-client-secret"
    Write-Host "  - GEMINI_API_KEY=your-gemini-api-key"
    Write-Host "  - STRIPE_API_KEY=your-stripe-api-key"
    Write-Host ""
    Write-Host "Cannot continue without .env file. Exiting..." -ForegroundColor Red
    exit 1
}

Write-Host "✓ .env file found" -ForegroundColor Green
Write-Host ""

# Check for Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}
Write-Host ""

# Check for old root .venv and auto-delete
if (Test-Path "..\\.venv") {
    Write-Host "⚠️  Found old .venv in project root. Removing it..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "..\\.venv"
    if ($LASTEXITCODE -eq 0 -or $?) {
        Write-Host "✓ Removed old .venv. This project now uses backend\.venv" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to remove old .venv. Please delete it manually:" -ForegroundColor Red
        Write-Host "  cd .."
        Write-Host "  Remove-Item -Recurse -Force .venv"
        Write-Host "  cd backend"
        Write-Host "  .\run_backend.ps1"
        exit 1
    }
    Write-Host ""
}

# Step 1: Check if virtual environment exists
if (-not (Test-Path ".venv")) {
    Write-Host "📦 Virtual environment not found. Creating .venv..." -ForegroundColor Yellow
    python -m venv .venv
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Virtual environment created successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
} else {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
    Write-Host ""
}

# Step 2: Activate virtual environment
Write-Host "🔌 Activating virtual environment..." -ForegroundColor Blue
$activateScript = Join-Path $ScriptDir ".venv\Scripts\Activate.ps1"

# Check if activation script exists
if (-not (Test-Path $activateScript)) {
    Write-Host "❌ Virtual environment activation script not found" -ForegroundColor Red
    exit 1
}

# Activate the virtual environment
& $activateScript
if ($LASTEXITCODE -eq 0 -or $?) {
    Write-Host "✓ Virtual environment activated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to activate virtual environment" -ForegroundColor Red
    Write-Host "You may need to run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Step 3: Install/update dependencies
Write-Host "📦 Installing/updating dependencies from requirements.txt..." -ForegroundColor Blue
pip install -r requirements.txt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies ready" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Ask about database seeding
Write-Host "🗄️  Database Seeding" -ForegroundColor Yellow
Write-Host "The seed script will:"
Write-Host "  - Automatically delete sqlite.db if it exists"
Write-Host "  - Create a fresh database with sample data"
Write-Host "  - Create admin user: admin@sjsu.edu / admin123"
Write-Host ""
$seed = Read-Host "Run database seed script? (y/n)"
Write-Host ""

if ($seed -match "^[Yy]$") {
    Write-Host "🌱 Seeding database..." -ForegroundColor Blue
    python -m app.seed
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database seeded successfully" -ForegroundColor Green
        Write-Host "  Admin login: admin@sjsu.edu / admin123" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to seed database" -ForegroundColor Red
        $continueAnyway = Read-Host "Continue anyway? (y/n)"
        if ($continueAnyway -notmatch "^[Yy]$") {
            Write-Host "Exiting..." -ForegroundColor Red
            exit 1
        }
    }
    Write-Host ""
}

# Step 5: Ask about robot simulation
$runRobot = $false
$robotJob = $null

Write-Host "🤖 Robot Simulation" -ForegroundColor Yellow
Write-Host "The robot simulation will:"
Write-Host "  - Run in the background alongside the backend server"
Write-Host "  - Process queued orders automatically"
Write-Host "  - Change order status from queued to shipped"
Write-Host "  - Trigger route optimization"
Write-Host ""
$robotChoice = Read-Host "Run robot simulation? (y/n)"
Write-Host ""

if ($robotChoice -match "^[Yy]$") {
    # Check if keys.json exists
    if (-not (Test-Path "keys.json")) {
        Write-Host "❌ Error: keys.json not found!" -ForegroundColor Red
        Write-Host "Robot simulation requires Google service account credentials." -ForegroundColor Yellow
        Write-Host "Contact a team member for the keys.json file."
        Write-Host ""
        Write-Host "Cannot run robot simulation without keys.json. Exiting..." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ keys.json found" -ForegroundColor Green
    $runRobot = $true
    Write-Host ""
}

# Setup cleanup function
function Cleanup {
    Write-Host ""
    Write-Host "Shutting down..." -ForegroundColor Yellow
    
    # Stop robot simulation if running
    if ($null -ne $robotJob) {
        Write-Host "Stopping robot simulation (Job ID: $($robotJob.Id))..." -ForegroundColor Yellow
        Stop-Job -Job $robotJob -ErrorAction SilentlyContinue
        Remove-Job -Job $robotJob -ErrorAction SilentlyContinue
    }
    
    # Stop uvicorn server
    if ($null -ne $serverJob) {
        Write-Host "Stopping backend server (Job ID: $($serverJob.Id))..." -ForegroundColor Yellow
        Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
        Remove-Job -Job $serverJob -ErrorAction SilentlyContinue
    }
    
    Write-Host "✓ All processes stopped" -ForegroundColor Green
}

# Register cleanup on script exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } | Out-Null

# Step 6: Start the backend server
Write-Host "======================================" -ForegroundColor Blue
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Blue
Write-Host ""
Write-Host "Backend will be available at: http://localhost:8080" -ForegroundColor Green
Write-Host "Health check: http://localhost:8080/healthz" -ForegroundColor Green
Write-Host "API docs: http://localhost:8080/docs" -ForegroundColor Green
Write-Host ""

# Start robot simulation if requested
if ($runRobot) {
    Write-Host "🤖 Starting robot simulation in background..." -ForegroundColor Blue
    $robotJob = Start-Job -ScriptBlock {
        Set-Location $using:ScriptDir
        & "$using:ScriptDir\.venv\Scripts\python.exe" -m app.robot.main
    }
    Write-Host "✓ Robot simulation started (Job ID: $($robotJob.Id))" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Press Ctrl+C to stop all processes" -ForegroundColor Yellow
Write-Host ""

# Start uvicorn server in background job
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:ScriptDir
    & "$using:ScriptDir\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
}

# Monitor the jobs and display output
try {
    while ($true) {
        # Check if server job is still running
        if ($serverJob.State -ne "Running") {
            Write-Host "Server stopped" -ForegroundColor Yellow
            break
        }
        
        # Receive and display output from server
        $serverOutput = Receive-Job -Job $serverJob
        if ($serverOutput) {
            Write-Output $serverOutput
        }
        
        # Receive and display output from robot if running
        if ($null -ne $robotJob) {
            $robotOutput = Receive-Job -Job $robotJob
            if ($robotOutput) {
                Write-Host "[ROBOT] " -ForegroundColor Cyan -NoNewline
                Write-Output $robotOutput
            }
        }
        
        Start-Sleep -Milliseconds 100
    }
} catch {
    Write-Host "Interrupted" -ForegroundColor Yellow
} finally {
    Cleanup
}

