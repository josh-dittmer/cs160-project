# CS160 Food Delivery Project

An on-demand food delivery service built with FastAPI (backend) and Next.js (frontend).

## 🚀 Quick Start - Run the Full Application

### Prerequisites

- Python 3.8+ 
- Node.js 16+ and npm
- Git

### Backend Setup (4 steps)

```bash
# 1. Navigate to project and create virtual environment
cd cs160-project
python3 -m venv .venv
source .venv/bin/activate          # On Windows: .venv\Scripts\activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 2.5 Reset Database (Optional)

If you need to reseed with fresh data, delete the existing database first:

**macOS/Linux:**
```bash
rm backend/sqlite.db
```

**Windows PowerShell:**
```powershell
Remove-Item backend\sqlite.db
```

Then run step 3 to reseed.

# 3. Seed the database
PYTHONPATH=. python -m backend.app.seed 

"""
FOR WINDOWNS(powershell):
$env:PYTHONPATH="."
#python -m backend.app.seed
"""

# 4. Start the backend server
PYTHONPATH=. uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080 
""" 
FOR WINDOWS:
$env:PYTHONPATH="."
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080
"""
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

---

## 🏗️ Project Structure

```
cs160-project/
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── main.py      # FastAPI app entry point
│   │   ├── models.py    # Database models
│   │   ├── schemas.py   # Pydantic schemas
│   │   ├── auth.py      # Authentication utilities
│   │   ├── seed.py      # Database seeding
│   │   └── routers/     # API route handlers
│   ├── docs/            # API documentation
│   └── requirements.txt # Python dependencies
│
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── app/        # Next.js app router pages
│   │   ├── components/ # React components
│   │   ├── contexts/   # React contexts (auth, theme)
│   │   └── lib/        # API client and utilities
│   └── package.json    # Node dependencies
│
└── tests/              # Test files
```

---

## 🔑 Features

- **User Authentication**
  - Email/password signup and login
  - Google OAuth integration
  - JWT token-based authentication

- **Smart Search**
  - Real-time autocomplete suggestions
  - Fuzzy matching with typo tolerance (handles "oganic aples" → "Organic Apples")
  - Intelligent word-by-word matching
  - Keyboard navigation support (Arrow keys, Enter, Escape)

- **Food Browsing**
  - Browse items by category (Fruits, Vegetables, Meat, Dairy)
  - View item details with images
  - Circular carousel navigation

- **Modern UI**
  - Responsive design
  - Dark/light theme toggle
  - Amazon-style account management

---

## 📚 Documentation

- **Backend API Documentation:** `backend/docs/`
  - [Authentication API](backend/docs/api/AUTH_API.md)
  - [Items API](backend/docs/api/ITEMS_API.md)
  - [Frontend Integration Guide](backend/docs/api/FRONTEND_INTEGRATION.md)

- **Backend Developer Guide:** `backend/readme.md`

---

## 🧪 Running Tests

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all tests
PYTHONPATH=. pytest tests/ -v

# Run specific test file
PYTHONPATH=. pytest tests/test_auth.py -v
```

---

## 🛠️ Technology Stack

**Backend:**
- FastAPI - Modern Python web framework
- SQLAlchemy - ORM for database
- SQLite - Database
- Pydantic - Data validation
- JWT - Authentication tokens
- Google OAuth 2.0 - Social login
- RapidFuzz - Fuzzy string matching for search

**Frontend:**
- Next.js 15 - React framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Swiper - Carousel component
- Framer Motion - Animations

---

## 🔧 Environment Variables

### Backend (`backend/.env`)
```bash
SECRET_KEY=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
```

---

## 📝 License

This project is for educational purposes as part of CS160.

---

## 👥 Contributors

CS160 Project Team 6 

---

## 🐛 Troubleshooting

### Backend won't start
- Make sure virtual environment is activated: `source .venv/bin/activate`
- Check if port 8080 is already in use
- Verify all dependencies are installed: `pip install -r backend/requirements.txt`

### Frontend won't start
- Make sure you're in the frontend directory: `cd frontend`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check if port 3000 is already in use

### Database issues
- Delete and re-seed the database:
  ```bash
  rm backend/sqlite.db
  PYTHONPATH=. python -m backend.app.seed
  ```

### Google Sign-In not working
- Verify `GOOGLE_CLIENT_ID` is set in both backend and frontend `.env` files
- Ensure `http://localhost:3000` is added to authorized origins in Google Cloud Console
- Check browser console for specific error messages

---

For more detailed information, see the documentation in the `backend/docs/` directory.
