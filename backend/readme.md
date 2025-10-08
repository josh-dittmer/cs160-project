## CS160 Project - Developer Guide

## 🚀 Quick Start - Run the Full Application

### Backend Setup (4 steps)

```bash
# 1. Navigate to project and create virtual environment
cd cs160-project
python3 -m venv .venv
source .venv/bin/activate          # On Windows: .venv\Scripts\activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Seed the database
PYTHONPATH=. python -m backend.app.seed

# 4. Start the backend server
PYTHONPATH=. uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080
```

**Backend is now running on `http://localhost:8080`** ✅

Test it: Open `http://localhost:8080/healthz` or run `curl http://localhost:8080/healthz`

---

### Frontend Setup (3 steps)

**Open a new terminal window** and run:

```bash
# 1. Navigate to frontend directory
cd cs160-project/frontend

# 2. Install dependencies (only needed first time)
npm install

# 3. Start the development server
npm run dev
```

**Frontend is now running on `http://localhost:3000`** ✅

Open `http://localhost:3000` in your browser to see the app!

---

### 📝 Summary

**Backend:** `http://localhost:8080` (API server)  
**Frontend:** `http://localhost:3000` (Web application)

Both servers need to be running simultaneously for the full application to work.

For detailed setup, testing, and API documentation, see sections below. ⬇️

---

### 1) Clone the repository

```bash
git clone https://github.com/josh-dittmer/cs160-project cs160-project
cd cs160-project
git status
```

If you use SSH:
```bash
git clone git@github.com:<org>/<repo>.git cs160-project
```

### 2) Create a feature branch and make changes

Recommended workflow:
- Pull latest main: `git checkout main && git pull`
- Create a branch: `git checkout -b <area>/<short-feature-name>`
- Make edits and run locally (see Backend setup below)

Commit guidelines:
- Small, focused commits
- Conventional-ish messages: `area: short description` (e.g., `backend: add items router`)

```bash
git add -A
git commit -m "backend: implement items list/detail and reviews"
```

Push and open PR:
```bash
git push -u origin <your-branch>
```

### 3) Backend APIs - Setup and Run (local)

Requirements:
- Python 3.11+

Create virtual environment and install deps:
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\\Scripts\\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Seed the database:
```bash
PYTHONPATH=. python -m backend.app.seed
```

Start the server:
```bash
PYTHONPATH=. uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
# Open http://localhost:8000/healthz
```

CORS (local): Frontend default origin is `http://localhost:3000`. Update in `backend/app/main.py` if needed.

### 4) Optional: Use helper script

The script `scripts/backendctl.sh` can manage venv, data, and server under a target path (default `/tmp/cs160-backend`).

```bash
chmod +x scripts/backendctl.sh

# One-time setup (creates venv, installs deps, seeds DB)
./scripts/backendctl.sh setup

# Start / Stop / Restart
./scripts/backendctl.sh start
./scripts/backendctl.sh stop
./scripts/backendctl.sh restart

# Clean restart (drops DB, reseeds, restarts)
./scripts/backendctl.sh clean-restart
```

### 5) Test the APIs (automated)

Install pytest (if not installed already):
```bash
pip install pytest
```

Run tests from repo root:
```bash
PYTHONPATH=. pytest -q
```

### 6) Test the APIs (manual)

With the server running on port 8000:

Health check:
```bash
curl -sS http://localhost:8000/healthz | jq
```

List items:
```bash
curl -sS "http://localhost:8000/api/items?limit=5" | jq
```

Item detail (replace `1` with a real id):
```bash
curl -sS http://localhost:8000/api/items/1 | jq
```

List reviews:
```bash
curl -sS "http://localhost:8000/api/items/1/reviews?limit=5" | jq
```

Create/update a review (auth header required):
```bash
curl -sS -X POST \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 123" \
  -d '{"rating":5,"title":"Nice","body":"Very good quality"}' \
  http://localhost:8000/api/items/1/reviews | jq
```

### 7) Prepare code for check-in

Before committing:
- Remove local artifacts: `.venv`, `backend/sqlite.db`, `__pycache__`, `*.pyc`, `.pytest_cache`
- Ensure `.gitignore` contains entries for the above (already included)
- Run tests and verify they pass

```bash
git add -A
git status
git commit -m "backend: ready for review"
git push
```

### 8) Authentication (NEW)

The backend now supports user signup, login, and Google OAuth!

**Quick test:**
```bash
# Run the example script (with server running)
python backend/test_auth_example.py
```

**Key features:**
- Email/password registration and login
- Google OAuth integration
- JWT token-based authentication
- Secure password hashing with bcrypt

**API Documentation:** See `backend/AUTH_API.md` for detailed endpoint documentation.

**Environment Variables:**
```bash
# Optional: Set a secure secret key for production
export SECRET_KEY="your-secret-key-here"

# Required for Google OAuth
export GOOGLE_CLIENT_ID="your-google-client-id"
```

**Running auth tests:**
```bash
# Run all auth tests
PYTHONPATH=. pytest tests/test_auth.py -v

# Run specific test
PYTHONPATH=. pytest tests/test_auth.py::test_signup_success -v
```

### 9) API Documentation

**📚 Complete API documentation is now organized in the `docs/` directory:**

- **[docs/README.md](docs/README.md)** - Documentation index and quick start
- **[docs/api/FRONTEND_INTEGRATION.md](docs/api/FRONTEND_INTEGRATION.md)** - ⭐ **START HERE** for frontend integration
- **[docs/api/AUTH_API.md](docs/api/AUTH_API.md)** - Authentication endpoints reference
- **[docs/api/ITEMS_API.md](docs/api/ITEMS_API.md)** - Items/products endpoints reference
- **[docs/api/VERIFICATION_REPORT.md](docs/api/VERIFICATION_REPORT.md)** - Test results, verification & implementation details

### 10) Useful references

- **Documentation**: `docs/` directory (organized API docs)
- **Server entry**: `backend/app/main.py`
- **Models**: `backend/app/models.py`
- **Schemas**: `backend/app/schemas.py`
- **Auth utilities**: `backend/app/auth.py`
- **Routers**: `backend/app/routers/auth.py`, `backend/app/routers/items.py`
- **Seed data**: `backend/app/seed.py`
- **Tests**: `tests/test_items.py`, `tests/test_auth.py`


