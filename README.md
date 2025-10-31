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

#### 1. Navigate to backend directory and create virtual environment

```bash
cd cs160-project/backend
python3 -m venv .venv
source .venv/bin/activate
```

**Windows:**
```powershell
cd cs160-project\backend
python -m venv .venv
.venv\Scripts\activate
```

> **Note:** If you already have `.venv` in the project root, you can still use it:
> ```bash
> cd cs160-project
> source .venv/bin/activate  # or .venv\Scripts\activate on Windows
> cd backend
> ```
> Then continue with the remaining steps below.

#### 2. Install backend dependencies

```bash
pip install -r requirements.txt
```

#### 2.5 Reset Database (Optional)

If you need to reseed with fresh data, delete the existing database first:

**macOS/Linux:**
```bash
rm sqlite.db
```

**Windows PowerShell:**
```powershell
Remove-Item sqlite.db
```

#### 3. Seed the database

This will create the database tables and an admin user.

```bash
python -m app.seed
```

**Admin Credentials:** `admin@sjsu.edu` / `admin123`

#### 4. Start the backend server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
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

- **AI-Powered Video Generation** 
  - Generate professional marketing videos from text descriptions using Veo 3.1
  - Creates 8-second videos with native audio (dialogue, sound effects)
  - Cinematic quality in 720p/1080p resolution
  - Two generation modes: Standard (best quality) and Fast (optimized speed)
  - Async and sync generation workflows
  - Perfect for product demos, ads, and social media content
  - See [backend/docs/api/VIDEO_API.md](backend/docs/api/VIDEO_API.md) for API documentation

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

**macOS/Linux:**
```bash
# Navigate to backend directory and activate virtual environment
cd cs160-project/backend
source .venv/bin/activate

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v

# Run admin RBAC tests (23 tests)
pytest tests/test_admin.py -v
```

**Windows PowerShell:**
```powershell
# Navigate to backend directory and activate virtual environment
cd cs160-project\backend
.venv\Scripts\activate

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_auth.py -v

# Run admin RBAC tests (23 tests)
pytest tests/test_admin.py -v
```

> **Note:** If you have `.venv` in the project root, activate it there first, then `cd backend` before running tests.

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
- Google Gemini AI - AI content generation
  - Gemini 2.5 Flash Image - AI image generation
  - Veo 3.1 - AI video generation
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
- Make sure you're in the backend directory: `cd backend`
- Make sure virtual environment is activated:
  - macOS/Linux: `source .venv/bin/activate`
  - Windows PowerShell: `.venv\Scripts\activate`
- Check if port 8080 is already in use
- Verify all dependencies are installed: `pip install -r requirements.txt`

### Frontend won't start
- Make sure you're in the frontend directory: `cd frontend`
- Delete `node_modules` and reinstall:
  - macOS/Linux: `rm -rf node_modules && npm install`
  - Windows PowerShell: `Remove-Item -Recurse -Force node_modules; npm install`
- Check if port 3000 is already in use

### Database issues
- Delete and re-seed the database (from backend directory):
  
  **macOS/Linux:**
  ```bash
  cd backend
  rm sqlite.db
  python -m app.seed
  ```
  
  **Windows PowerShell:**
  ```powershell
  cd backend
  Remove-Item sqlite.db
  python -m app.seed
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

### AI video generation not working
- Verify `GEMINI_API_KEY` is set in `backend/.env` (same key as image generation)
- Video generation requires paid API access - Veo is not available in free tier
- Check your API quota and billing at https://ai.google.dev/pricing
- Generation takes 30-60 seconds - use async endpoint for better UX
- Test the API health: `GET /api/admin/video/health`
- Run test script (from backend directory): `python test_video_generation.py`
- See [backend/docs/api/VIDEO_API.md](backend/docs/api/VIDEO_API.md) for complete API documentation

---

## 📚 Documentation

For more detailed information about specific features:

- **[docs/AI_IMAGE_GENERATION.md](docs/AI_IMAGE_GENERATION.md)** - AI image generation setup and usage guide
- **[backend/docs/api/VIDEO_API.md](backend/docs/api/VIDEO_API.md)** - AI video generation API documentation 
- **[docs/PROFILE_IMPLEMENTATION_SUMMARY.md](docs/PROFILE_IMPLEMENTATION_SUMMARY.md)** - User profile, address selector, map integration
- **[docs/GOOGLE_MAPS_SETUP.md](docs/GOOGLE_MAPS_SETUP.md)** - Google Maps API setup guide
- **[docs/ADMIN.md](docs/ADMIN.md)** - Admin panel and role-based access control
- **[docs/IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Admin RBAC implementation details
- **[docs/AUTHENTICATION_INTEGRATION.md](docs/AUTHENTICATION_INTEGRATION.md)** - Authentication system details
- **[backend/docs/](backend/docs/)** - API documentation and search implementation

---
