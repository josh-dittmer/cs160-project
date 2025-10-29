# CS160 Food Delivery Project

An on-demand food delivery service built with FastAPI (backend) and Next.js (frontend).

## 🚀 Quick Start - Run the Full Application

### Prerequisites

- Python 3.8+ 
- Node.js 16+ and npm
- Git

---

## 🔧 Environment Variables

**Set these up before running the application:**

### Backend (`backend/.env`)
```bash
SECRET_KEY=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GEMINI_API_KEY=your-gemini-api-key 
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

### Backend Setup

#### 1. Navigate to project and create virtual environment

```bash
cd cs160-project
python3 -m venv .venv
source .venv/bin/activate
```

**Windows:**
```powershell
cd cs160-project
python -m venv .venv
.venv\Scripts\activate
```

#### 2. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

#### 2.5 Reset Database (Optional)

If you need to reseed with fresh data, delete the existing database first:

**macOS/Linux:**
```bash
rm backend/sqlite.db
```

**Windows PowerShell:**
```powershell
Remove-Item backend\sqlite.db
```

#### 3. Seed the database

This will create the database tables and an admin user.

**macOS/Linux:**
```bash
PYTHONPATH=. python -m backend.app.seed
```

**Windows PowerShell:**
```powershell
$env:PYTHONPATH="."
python -m backend.app.seed
```

**Admin Credentials:** `admin@sjsu.edu` / `admin123`

#### 4. Start the backend server

**macOS/Linux:**
```bash
PYTHONPATH=. uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080
```

**Windows PowerShell:**
```powershell
$env:PYTHONPATH="."
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8080
```


**Backend is now running on `http://localhost:8080`** ✅

Test it: Open `http://localhost:8080/healthz` or run `curl http://localhost:8080/healthz`

---

### Frontend Setup

**Open a new terminal window** and run:

#### 1. Navigate to frontend directory

```bash
cd cs160-project/frontend
```

#### 2. Install dependencies (only needed first time)

```bash
npm install
```

#### 3. Start the development server

```bash
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

- **User Profile Management**
  - Edit profile information (name, phone, delivery address)
  - Profile picture upload (file or URL) with Google OAuth integration
  - Password change (for email/password users)
  - Address validation restricted to San Jose, CA using Google Places API
  - Top-right address selector with interactive map view
  - Current location detection and geocoding
  - Auto-formatted phone numbers
  - See [docs/PROFILE_IMPLEMENTATION_SUMMARY.md](docs/PROFILE_IMPLEMENTATION_SUMMARY.md) for details

- **Role-Based Access Control**
  - Four user roles: Admin, Manager, Employee, Customer
  - Admin panel for user and inventory management
  - Default admin login: `admin@sjsu.edu` / `admin123`
  - See [docs/ADMIN.md](docs/ADMIN.md) for complete admin documentation

- **AI-Powered Image Generation**
  - Generate product images from text descriptions using Google Gemini AI
  - Three image options: URL, file upload, or AI generation
  - Specialized for food product photography
  - Automatic image optimization (JPEG, 85% quality)
  - Admin-only access with proper authentication
  - See [docs/AI_IMAGE_GENERATION.md](docs/AI_IMAGE_GENERATION.md) for setup guide

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

---

## 🧪 Running Tests

```bash
# Activate virtual environment
source .venv/bin/activate

# Run all tests
PYTHONPATH=. pytest tests/ -v

# Run specific test file
PYTHONPATH=. pytest tests/test_auth.py -v

# Run admin RBAC tests (23 tests)
PYTHONPATH=. pytest tests/test_admin.py -v
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
- Google Gemini AI (2.5 Flash Image/Nano Banana) - AI image generation
- Pillow - Image processing and optimization

**Frontend:**
- Next.js 15 - React framework
- TypeScript - Type safety
- Tailwind CSS - Styling
- Swiper - Carousel component
- Framer Motion - Animations
- Google Places API - Address autocomplete and validation
- @react-google-maps/api - Google Maps integration

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

### Address autocomplete or map not working
- Verify `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `frontend/.env.local`
- Ensure **Places API**, **Maps JavaScript API**, and **Geocoding API** are enabled in Google Cloud Console
- Restart the frontend dev server after adding the API key: `npm run dev`
- See [docs/GOOGLE_MAPS_SETUP.md](docs/GOOGLE_MAPS_SETUP.md) for complete setup guide

### AI image generation not working
- Verify `GEMINI_API_KEY` is set in `backend/.env`
- Check your API quota at https://ai.dev/usage?tab=rate-limit
- Free tier has strict limits - wait 20-30 seconds between requests
- Consider upgrading to paid tier for production use
- See [docs/AI_IMAGE_GENERATION.md](docs/AI_IMAGE_GENERATION.md) for setup and troubleshooting

---

## 📚 Documentation

For more detailed information about specific features:

- **[docs/AI_IMAGE_GENERATION.md](docs/AI_IMAGE_GENERATION.md)** - AI image generation setup and usage guide
- **[docs/PROFILE_IMPLEMENTATION_SUMMARY.md](docs/PROFILE_IMPLEMENTATION_SUMMARY.md)** - User profile, address selector, map integration
- **[docs/GOOGLE_MAPS_SETUP.md](docs/GOOGLE_MAPS_SETUP.md)** - Google Maps API setup guide
- **[docs/ADMIN.md](docs/ADMIN.md)** - Admin panel and role-based access control
- **[docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Admin RBAC implementation details
- **[docs/AUTHENTICATION_INTEGRATION.md](docs/AUTHENTICATION_INTEGRATION.md)** - Authentication system details
- **[backend/docs/](backend/docs/)** - API documentation and search implementation

---
