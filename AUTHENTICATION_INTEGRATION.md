# Authentication Integration Guide

This document explains how the frontend and backend authentication has been integrated.

## What Was Changed

### Frontend Changes

1. **Created `/frontend/src/lib/api/auth.ts`**
   - API utility functions for `signup()`, `login()`, and `getCurrentUser()`
   - Handles HTTP requests to the backend authentication endpoints
   - Includes proper error handling and TypeScript types

2. **Created `/frontend/src/contexts/auth.tsx`**
   - Authentication context using React Context API
   - Manages user state and JWT token across the application
   - Stores authentication data in localStorage for persistence
   - Provides `useAuth()` hook for easy access in components

3. **Updated `/frontend/src/components/provider/provider.tsx`**
   - Added `AuthProvider` to wrap the application
   - Makes authentication state available throughout the app

4. **Created `/frontend/src/app/signup/page.tsx`**
   - Complete signup page with form validation
   - Integrates with backend `/api/auth/signup` endpoint
   - Automatically logs in user after successful signup
   - Redirects to dashboard after signup

5. **Updated `/frontend/src/app/login/page.tsx`**
   - Integrates with backend `/api/auth/login` endpoint
   - Handles authentication errors with user-friendly messages
   - Stores JWT token and user info in context
   - Redirects to dashboard after successful login
   - Removed Google OAuth UI (as requested)

### Backend

No changes were needed to the backend - it was already properly configured with:
- CORS enabled for `http://localhost:3000`
- Working `/api/auth/signup` and `/api/auth/login` endpoints
- JWT token generation with 7-day expiration
- Proper error handling and validation

## How to Test

### 1. Start the Backend Server

```bash
cd /Users/manomay/Developer/cs160-project
./scripts/backendctl.sh setup    # First time only
./scripts/backendctl.sh start    # Start the server
```

The backend will run on `http://localhost:8000`

### 2. Start the Frontend Server

```bash
cd /Users/manomay/Developer/cs160-project/frontend
npm install                      # First time only
npm run dev
```

The frontend will run on `http://localhost:3000`

### 3. Test Signup Flow

1. Navigate to `http://localhost:3000/signup`
2. Fill in the form:
   - Full Name: Test User
   - Email: test@example.com
   - Password: password123 (minimum 8 characters)
3. Click "Sign Up"
4. You should be redirected to `/home/dashboard` after successful signup
5. Check browser console and localStorage to see the stored token

### 4. Test Login Flow

1. Navigate to `http://localhost:3000/login`
2. Enter credentials:
   - Email: test@example.com
   - Password: password123
3. Click "Sign In"
4. You should be redirected to `/home/dashboard` after successful login

### 5. Verify Authentication State

Open browser DevTools and check:
- **Console**: Should show no errors
- **Application/Storage > Local Storage**: Should see `auth_token` and `user_info`
- **Network tab**: Should see successful POST requests to `/api/auth/signup` or `/api/auth/login`

## API Endpoints Used

### Signup
- **URL**: `POST http://localhost:8000/api/auth/signup`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "full_name": "John Doe"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "is_active": true,
      "created_at": "2025-10-01T12:00:00"
    }
  }
  ```

### Login
- **URL**: `POST http://localhost:8000/api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**: Same as signup

### Get Current User
- **URL**: `GET http://localhost:8000/api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User object

## Authentication Flow

1. User submits signup/login form
2. Frontend sends POST request to backend API
3. Backend validates credentials and creates/verifies user
4. Backend generates JWT token (7-day expiration)
5. Backend returns token + user info
6. Frontend stores token in localStorage and Context
7. Frontend redirects to dashboard
8. For protected routes, frontend includes token in Authorization header

## Security Features

- Passwords are hashed with bcrypt on the backend
- JWT tokens expire after 7 days
- CORS is configured to only allow requests from localhost:3000
- Email validation on both frontend and backend
- Password minimum length: 8 characters
- Error messages don't reveal if email exists (security best practice)

## Using Authentication in Components

```typescript
import { useAuth } from '@/contexts/auth';

function MyComponent() {
  const { user, token, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return (
    <div>
      <p>Welcome, {user?.full_name || user?.email}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Troubleshooting

### CORS Errors
- Make sure backend is running on port 8000
- Check that CORS is configured in `backend/app/main.py`

### Token Not Persisting
- Check browser localStorage in DevTools
- Make sure you're not in incognito/private mode

### Login/Signup Fails
- Check backend server logs
- Verify backend is running: `curl http://localhost:8000/healthz`
- Check Network tab in DevTools for error details

### "User already exists" Error
- The email is already registered
- Try a different email or use the login page instead

## Next Steps

To add protected routes:
1. Create a middleware or wrapper component that checks `isAuthenticated`
2. Redirect to `/login` if not authenticated
3. Include the token in API requests that require authentication

Example:
```typescript
const response = await fetch(`${API_BASE_URL}/api/protected-endpoint`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});
```

