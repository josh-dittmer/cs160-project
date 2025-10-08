# Authentication API Documentation

This document describes the authentication endpoints added to the OFS API.

## Overview

The authentication system supports:
- **Email/Password Registration & Login**: Users can sign up and log in with email and password
- **Google OAuth**: Users can sign up or log in using their Google account
- **JWT Tokens**: Secure token-based authentication for API requests
- **Account Linking**: Users who sign up with email can later link their Google account

## API Endpoints

### 1. Sign Up (Register)

Register a new user with email and password.

**Endpoint:** `POST /api/auth/signup`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe"  // optional
}
```

**Success Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2025-09-30T12:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Email already registered
- `422 Unprocessable Entity`: Invalid email format or password too short (min 8 characters)

---

### 2. Login

Login with email and password.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Success Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2025-09-30T12:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Incorrect email or password
- `403 Forbidden`: User account is inactive

---

### 3. Google OAuth Login

Authenticate or register using Google account.

**Endpoint:** `POST /api/auth/google`

**Request Body:**
```json
{
  "id_token": "google-id-token-from-client"
}
```

**How to get the ID token:**
1. Implement Google Sign-In on your frontend
2. When user signs in with Google, obtain the ID token
3. Send the ID token to this endpoint

**Success Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2025-09-30T12:00:00Z"
  }
}
```

**Behavior:**
- If user doesn't exist, creates a new account
- If user exists with same email, links Google account
- If user exists with same Google ID, logs them in

**Error Responses:**
- `401 Unauthorized`: Invalid Google token
- `403 Forbidden`: User account is inactive
- `501 Not Implemented`: Google OAuth not configured (missing GOOGLE_CLIENT_ID)

**Configuration:**
Set the `GOOGLE_CLIENT_ID` environment variable with your Google OAuth Client ID.

---

### 4. Get Current User

Get information about the currently authenticated user.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2025-09-30T12:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing, invalid, or expired token
- `404 Not Found`: User not found

---

## Authentication Flow

### Using JWT Tokens

After successful signup or login, you receive an `access_token`. Include this token in the `Authorization` header for protected endpoints:

```
Authorization: Bearer your-access-token-here
```

### Token Expiration

- Tokens expire after 1 day (24 hours)
- Expired tokens will return `401 Unauthorized`
- User must login again to get a new token

---

## Database Schema

### User Model

```python
class User(Base):
    id: int                      # Primary key
    email: str                   # Unique email
    hashed_password: str | None  # Password hash (None for Google-only users)
    full_name: str | None        # Optional full name
    google_id: str | None        # Google account ID (if linked)
    is_active: bool              # Account status (default: True)
    created_at: datetime         # Account creation timestamp
    updated_at: datetime         # Last update timestamp
```

---

## Testing

### Running Tests

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Run all tests
pytest tests/

# Run only auth tests
pytest tests/test_auth.py

# Run specific test
pytest tests/test_auth.py::test_signup_success
```

### Test Coverage

The test suite includes:
- ✅ Signup with valid/invalid data
- ✅ Login with correct/incorrect credentials
- ✅ Google OAuth for new and existing users
- ✅ JWT token validation and expiration
- ✅ Account linking (email + Google)
- ✅ Full authentication flows

---

## Security Considerations

1. **Password Hashing**: Passwords are hashed using bcrypt
2. **JWT Tokens**: Tokens are signed with HS256 algorithm
3. **Secret Key**: Configure `SECRET_KEY` environment variable in production
4. **HTTPS**: Always use HTTPS in production to protect tokens in transit
5. **Token Storage**: Store tokens securely on the client (e.g., httpOnly cookies or secure storage)

---

## Environment Variables

```bash
# Required for production
SECRET_KEY=your-secret-key-here

# Required for Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# Optional: Token expiration (default: 1 day / 24 hours)
# ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

---

## Migration Notes

### Backward Compatibility

The old `X-User-Id` header authentication is still supported for backward compatibility with existing tests. However, all new code should use JWT tokens with the `Authorization: Bearer` header.

### Database Migration

If you have an existing database, the new `users` table will be created automatically. The `reviews.user_id` field now has a foreign key constraint to `users.id`.

---

## Example Usage

### JavaScript/Fetch Example

```javascript
// Signup
const signupResponse = await fetch('http://localhost:8000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword123',
    full_name: 'John Doe'
  })
});
const { access_token, user } = await signupResponse.json();

// Store token
localStorage.setItem('token', access_token);

// Use token for authenticated requests
const meResponse = await fetch('http://localhost:8000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
const currentUser = await meResponse.json();
```

### Python/Requests Example

```python
import requests

# Signup
response = requests.post(
    'http://localhost:8000/api/auth/signup',
    json={
        'email': 'user@example.com',
        'password': 'securepassword123',
        'full_name': 'John Doe'
    }
)
data = response.json()
token = data['access_token']

# Use token
me_response = requests.get(
    'http://localhost:8000/api/auth/me',
    headers={'Authorization': f'Bearer {token}'}
)
user = me_response.json()
```

---

## Support

For issues or questions, please refer to the test file `tests/test_auth.py` which demonstrates all authentication flows.

