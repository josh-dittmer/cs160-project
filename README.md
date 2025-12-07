# CS160 Food Delivery Project

An on-demand food delivery service built with FastAPI (backend) and Next.js (frontend).

## Running with Docker

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Instructions

1. Clone the repository:
```
git clone https://github.com/josh-dittmer/cs160-project.git
```

2. Obtain the following files and place them at the listed paths. They contain required API keys.
    - ```cs160-project/backend/.env```
    - ```cs160-project/backend/keys.json```
    - ```cs160-project/frontend/.env.local```

> **Existing vs. first-time runs**
>
> • If you're running Docker for the **first time**, skip ahead to step 3 and just build/start normally.  
> • If you've already run the stack before and have **changed database models**, reset the SQLite volume and rebuild before starting:
>   ```bash
>   docker compose down -v
>   docker compose build
>   docker compose up
>   ```

3. Build the Docker images with Docker compose:
```
cd cs160-project/docker
docker compose build
```

4. Run the containers:
```
docker compose up
```

5. The application is now available at http://localhost:3000/

## 🚀 Quick Start - Run the Full Application for Development

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
rm db/sqlite.db
```

**Windows PowerShell:**
```powershell
Remove-Item db\sqlite.db
```

#### 3. Seed the database

This will create the database tables and an admin user.

```bash
python -m app.seed
```

**Seeded Test Accounts:**

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@sjsu.edu` | `Admin@1234567890` |
| **Manager** | `mike@sjsu.edu` | `Mike@1234567890` |
| **Manager** | `mark@sjsu.edu` | `Mark@1234567890` |
| **Employee** | `alice@sjsu.edu` | `Alice@1234567890` |
| **Employee** | `bob@sjsu.edu` | `Bob@1234567890` |
| **Employee** | `trudy@sjsu.edu` | `Trudy@1234567890` |
| **Customer** | `george@sjsu.edu` | `George@1234567890` |
| **Customer** | `alex@sjsu.edu` | `Alex@1234567890` |
| **Customer** | `john@sjsu.edu` | `John@1234567890` |

> **Note:** Passwords follow the pattern: `Name@1234567890`

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
│   ├── tests/           # Unit, integration, and E2E tests
│   └── requirements.txt # Python dependencies
│
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── app/        # Next.js app router pages
│   │   ├── components/ # React components
│   │   ├── contexts/   # React contexts (auth, theme, cart)
│   │   └── lib/        # API client and utilities
│   └── package.json    # Node dependencies
│
└── docker/              # Docker configuration files
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

- **Role-Based Access Control**
  - Four user roles: Admin, Manager, Employee, Customer
  - Admin panel for user, inventory, and order management
  - Default admin login: `admin@sjsu.edu` / `Admin@1234567890` (see Quick Start for all test accounts)

- **AI-Powered Image Generation**
  - Generate product images from text descriptions using Google Gemini AI
  - Three image options: URL, file upload, or AI generation
  - Specialized for food product photography
  - Automatic image optimization (JPEG, 85% quality)
  - Admin-only access with proper authentication

- **AI-Powered Video Generation** 
  - Generate professional marketing videos from text descriptions using Veo 3.1
  - Creates 8-second videos with native audio (dialogue, sound effects)
  - Cinematic quality in 720p/1080p resolution
  - Two generation modes: Standard (best quality) and Fast (optimized speed)
  - Async and sync generation workflows
  - Perfect for product demos, ads, and social media content

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

## 📖 User Guide

This guide explains how to use the OFS (On-Demand Food Delivery Service) application.

### Getting Started

#### Landing Page
When you first visit the application, you'll see the landing page featuring:
- A video background showcasing OFS
- **Sign In** and **Sign Up** buttons to access your account
- A link to **view products** without logging in (guest browsing)
- Information about OFS services and delivery area (San Jose, CA)

#### Creating an Account
1. Click **Sign Up** on the landing page
2. Fill in your details:
   - **Full Name** (optional)
   - **Email** (required)
   - **Password** (required) - must meet the following requirements:
     - At least 14 characters long
     - At least one uppercase letter (A-Z)
     - At least one lowercase letter (a-z)
     - At least one number (0-9)
     - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
     - Cannot start or end with a space
3. Alternatively, click **Sign up with Google** for quick registration
4. After signup, you'll be redirected to the customer dashboard

#### Signing In
1. Click **Sign In** on the landing page
2. Enter your email and password, or use **Sign in with Google**
3. You'll be redirected to the appropriate dashboard based on your role:
   - **Customers** → Home Dashboard
   - **Employees** → Employee Dashboard
   - **Managers** → Manager Dashboard
   - **Admins** → Admin Dashboard

---

### Customer Experience

#### Browsing Products
The home dashboard displays products organized by category:
- **Fruits** - Fresh fruits carousel
- **Vegetables** - Fresh vegetables carousel
- **Meat** - Meat products carousel
- **Dairy** - Dairy products carousel
- **Grains** - Grain products carousel

Use the **circular carousel navigation** (arrows) to browse items within each category.

#### Searching for Products
The search bar at the top supports:
- **Real-time autocomplete** - suggestions appear as you type
- **Fuzzy matching** - handles typos (e.g., "oganic aples" finds "Organic Apples")
- **Voice search** - click the microphone icon to search by voice (Chrome, Edge, Safari)
- **Keyboard navigation** - use Arrow keys to navigate suggestions, Enter to select, Escape to close

If your search matches exactly one item, you'll be taken directly to that item's page.

#### Viewing Product Details
Click on any product to see:
- Large product image with **zoom on hover**
- Product name, category, and price
- Stock availability
- Product description
- **Nutrition Facts** (expandable panel)
- **Product video** (if available)
- **Add to Cart** button with quantity selector

#### Adding Items to Cart
- **From product cards**: Hover over a product and click the **+** button
- **From product detail page**: Use the quantity selector and click **Add to Cart**
- Items already in cart will show a notification - adjust quantity in the cart instead

#### Managing Your Cart
Click the **cart icon** in the top-right to open the cart preview:
- View all items with images, prices, and weights
- Adjust quantities using **+** and trash buttons
- See total price and weight
- **Free shipping** for orders under 20 lbs (otherwise $10 shipping fee)
- Click **Continue** to proceed to checkout

#### Favorites
Save items for later by clicking the **star icon** on any product card:
- Access your favorites from the sidebar: **Favorites**
- Click the star again to remove from favorites
- Requires login

#### Setting Your Delivery Address
Click the **location icon** in the top bar to set your delivery address:
- **Use My Current Location** - auto-detect your address (must be in San Jose, CA)
- **Manual entry** - type your address and select from Google Places suggestions
- View your saved address on an interactive map
- Edit your address anytime by clicking the location selector

> **Note**: OFS currently delivers only to San Jose, CA addresses.

#### Checkout Process
1. From the cart, click **Continue** to go to checkout
2. Review your order:
   - Verify your delivery address (click **Change address** if needed)
   - Review items and quantities (adjust if needed)
   - Check shipping details and total weight
3. Enter payment information via **Stripe**:
   - Credit/debit card details
   - Secure payment processing
4. Click **Complete Purchase** to place your order

#### Tracking Orders
Access your orders from the sidebar: **Orders**

**Active Orders** (Packing or Shipped):
- Click on an order to view details and track delivery
- See real-time delivery status and progress bar
- View delivery route on an interactive map
- Track the delivery robot's location

**Completed Orders**:
- View order history with all details
- See items purchased, quantities, and totals

---

### Profile Management

Access your profile by clicking your **My Account** button in the sidebar.

#### View & Edit Profile
- **Profile picture**: Upload an image file 
- **Name**: Update your display name
- **Phone**: Add or update phone number (auto-formatted)
- **Address**: Update delivery address
- **Password**: Change your password (email/password users only; not for users signed in through Google)

---

### Employee Experience

Employees have access to inventory and order management tools.

#### Employee Dashboard
Shows quick stats:
- Total items in inventory
- Low stock items (≤10 units)
- Out of stock items

#### Quick Actions
- **Query Inventory** - Search and view all products
- **Update Stock Quantity** - Adjust inventory levels
- **View Orders** - See orders assigned for packing/delivery
- **View Stock Alerts** - Monitor low stock and out-of-stock items

---

### Manager Experience

Managers can manage users and inventory within their team.

#### Manager Dashboard
Access via `/manager/dashboard` after login. Includes:
- System statistics overview
- Order statistics
- User role breakdown
- Quick action links

#### Manager Capabilities
- **Users** - Manage subordinate employees (block/unblock)
- **Inventory** - Full CRUD for products (add, edit, delete, activate/deactivate, delete permanently)
  - **AI Image Generation** - Generate product images using Gemini 2.5 Flash Image (Nano Banana)
  - **AI Video Generation** - Generate marketing videos using Veo 3.1
- **Orders** - View and manage orders
- **Audit Logs** - View system activity logs of customers, subordinate employees, and themselves
- **Customer View** - Preview the customer experience

---

### Admin Experience

Admins have full system access and control.

#### Admin Dashboard
Access via `/admin/dashboard` after login. Displays:
- Total users, orders, and items
- Active/inactive items count
- Low stock alerts
- Order statistics (pending, delivered)
- User role breakdown
- Audit log activity (last 24 hours)

#### Admin Capabilities
- **Users** - Manage all users (change roles, block/unblock, assign managers)
- **Inventory** - Full CRUD for products (add, edit, delete, activate/deactivate, delete permanently)
  - **AI Image Generation** - Generate product images using Gemini 2.5 Flash Image (Nano Banana)
  - **AI Video Generation** - Generate marketing videos using Veo 3.1
- **Orders** - View all orders and update delivery status
- **Audit Logs** - Complete system activity log with filtering of all users
- **Customer View** - Preview the customer experience

---

## 🧪 Running Tests

### Unit/Integration Tests

**macOS/Linux:**
```bash
# Navigate to backend directory and activate virtual environment
cd cs160-project/backend
source .venv/bin/activate

# Run all unit tests
pytest tests/ -v --ignore=tests/e2e

# Run specific test file
pytest tests/test_auth.py -v

# Run admin RBAC tests 
pytest tests/test_admin.py -v
```

**Windows PowerShell:**
```powershell
# Navigate to backend directory and activate virtual environment
cd cs160-project\backend
.venv\Scripts\activate

# Run all unit tests
pytest tests/ -v --ignore=tests/e2e

# Run specific test file
pytest tests/test_auth.py -v

# Run admin RBAC tests
pytest tests/test_admin.py -v
```

### E2E Tests (Playwright)

E2E tests use Playwright to test the full application in a browser. **Both frontend and backend must be running.**

**First-time setup:**
```bash
# Install Playwright browsers (only needed once)
playwright install chromium
```

**Running E2E tests:**

```bash
# Make sure both servers are running first:
# Terminal 1: cd backend && uvicorn app.main:app --reload --port 8080
# Terminal 2: cd frontend && npm run dev

# Navigate to backend and activate venv
cd cs160-project/backend
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Run all e2e tests
pytest tests/e2e/ -v

# Run specific e2e test file
pytest tests/e2e/test_auth.py -v

# Run e2e tests with headed browser (see the browser)
pytest tests/e2e/ -v --headed
```

**E2E Test Files:**
- `test_landing_page.py` - Landing page content and navigation
- `test_auth.py` - Login and signup functionality
- `test_navigation.py` - Role-based navigation and routing
- `test_home.py` - Home dashboard and product browsing

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

### AI image generation not working
- Verify `GEMINI_API_KEY` is set in `backend/.env`
- Check your API quota at https://ai.dev/usage?tab=rate-limit
- Free tier has strict limits - wait 20-30 seconds between requests
- Consider upgrading to paid tier for production use

### AI video generation not working
- Verify `GEMINI_API_KEY` is set in `backend/.env` (same key as image generation)
- Video generation requires paid API access - Veo is not available in free tier
- Check your API quota and billing at https://ai.google.dev/pricing
- Generation takes 30-60 seconds - use async endpoint for better UX
- Test the API health: `GET /api/admin/video/health`

---

## 📚 Documentation

For more detailed information about the API:

- **[backend/docs/api/API.md](backend/docs/api/API.md)** - Complete API endpoint documentation

---
