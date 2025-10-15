# API Documentation

Complete API reference for the OFS (Organic Food Store) application.

**Base URL:** `http://localhost:8000`

---

## 📑 Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Item/Product Endpoints](#itemproduct-endpoints)
3. [Search Endpoint](#search-endpoint)
4. [Review Endpoints](#review-endpoints)
5. [Response Formats & Error Handling](#response-formats--error-handling)

---

## 🔐 Authentication Endpoints

### 1. Sign Up (Register)

Create a new user account with email and password.

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
    "created_at": "2025-10-14T12:00:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Email already registered
- `422 Unprocessable Entity` - Invalid email format or password too short (min 8 characters)

---

### 2. Login

Authenticate with email and password.

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
    "created_at": "2025-10-14T12:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Incorrect email or password
- `403 Forbidden` - User account is inactive

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
    "created_at": "2025-10-14T12:00:00Z"
  }
}
```

**Behavior:**
- Creates new account if user doesn't exist
- Links Google account if user exists with same email
- Logs in if Google ID already linked

**Error Responses:**
- `401 Unauthorized` - Invalid Google token
- `501 Not Implemented` - Google OAuth not configured

**Required Configuration:** Set `GOOGLE_CLIENT_ID` environment variable

---

### 4. Get Current User

Get information about the authenticated user.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2025-10-14T12:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Missing, invalid, or expired token
- `404 Not Found` - User not found

---

## 🛒 Item/Product Endpoints

### 1. List Items (Grouped)

Get all items grouped by a specified field (category, price range, etc.).

**Endpoint:** `GET /api/items`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `group_by` | string | **Yes** | Field to group by: `category`, `price`, `name` |

**Grouping Options:**
- `category` - Groups by product category (fruits, vegetables, meat, dairy, grains)
- `price` - Groups by price ranges (under_$3, $3_to_$5, $5_to_$10, over_$10)
- `name` - Groups alphabetically by first letter

**Example Requests:**
```bash
# Group by category (used by dashboard)
GET /api/items?group_by=category

# Group by price range
GET /api/items?group_by=price

# Group alphabetically
GET /api/items?group_by=name
```

**Success Response (200 OK) - Category Grouping:**
```json
{
  "fruits": [
    {
      "id": 1,
      "name": "Organic Apples",
      "price_cents": 399,
      "weight_oz": 16,
      "category": "fruits",
      "image_url": "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb",
      "avg_rating": 4.5,
      "ratings_count": 2
    }
  ],
  "vegetables": [...],
  "meat": [...],
  "dairy": [...],
  "grains": [...]
}
```

**Response Fields (Per Item):**
- `id` - Unique identifier
- `name` - Product name
- `price_cents` - Price in cents (399 = $3.99)
- `weight_oz` - Weight in ounces
- `category` - Product category
- `image_url` - Image URL (may be null)
- `avg_rating` - Average rating (0-5)
- `ratings_count` - Number of reviews

---

### 2. Get Item Details

Get complete information about a specific item.

**Endpoint:** `GET /api/items/{item_id}`

**Path Parameters:**
- `item_id` (integer, required) - Item ID

**Example Request:**
```bash
GET /api/items/1
```

**Success Response (200 OK):**
```json
{
  "id": 1,
  "name": "Organic Apples",
  "price_cents": 399,
  "weight_oz": 16,
  "category": "fruits",
  "image_url": "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb",
  "avg_rating": 4.5,
  "ratings_count": 2,
  "description": "Crisp organic apples. 1 lb bag.",
  "nutrition_json": "{\"calories\": 95, \"totalFat\": {\"value\": 0.3, \"unit\": \"g\"}}",
  "stock_qty": 50,
  "is_active": true
}
```

**Additional Fields (Detail View):**
- `description` - Product description
- `nutrition_json` - JSON string with nutrition facts
- `stock_qty` - Available inventory
- `is_active` - Whether item is available

**Error Responses:**
- `404 Not Found` - Item doesn't exist or is inactive

---

## 🔍 Search Endpoint

### Search Items (Autocomplete)

Search for items with intelligent fuzzy matching and typo tolerance.

**Endpoint:** `GET /api/search`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | **Yes** | Search query (minimum 1 character) |
| `limit` | integer | No | Max results (default: 10, max: 50) |

**Features:**
- ✅ Real-time autocomplete suggestions
- ✅ Handles typos ("oganic aples" → "Organic Apples")
- ✅ Word-by-word fuzzy matching (70% similarity threshold)
- ✅ Results ranked by relevance score
- ✅ Intelligent substring matching
- ✅ Powered by RapidFuzz library

**Example Requests:**
```bash
# Basic search
GET /api/search?q=apple

# Search with typo
GET /api/search?q=oganic%20aples

# Limit results
GET /api/search?q=organic&limit=5
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Organic Apples",
    "category": "fruits",
    "image_url": "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb",
    "price_cents": 399,
    "relevance_score": 0.9
  },
  {
    "id": 5,
    "name": "Organic Blueberries",
    "category": "fruits",
    "image_url": "https://images.unsplash.com/photo-1498557850523-fd3d118b962e",
    "price_cents": 599,
    "relevance_score": 0.75
  }
]
```

**Response Fields:**
- `id` - Item ID
- `name` - Item name
- `category` - Product category
- `image_url` - Image URL
- `price_cents` - Price in cents
- `relevance_score` - Match quality (0-1, higher = better)

**Algorithm Details:**
- Single-word queries: 75% similarity required
- Multi-word queries: All words must match with 70%+ similarity
- Results sorted by relevance_score (highest first)
- Empty query returns no results

---

## ⭐ Review Endpoints

### 1. Get Item Reviews

Get paginated reviews for a specific item.

**Endpoint:** `GET /api/items/{item_id}/reviews`

**Path Parameters:**
- `item_id` (integer, required) - Item ID

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 10 | Number of reviews (1-100) |
| `offset` | integer | 0 | Reviews to skip (pagination) |

**Example Requests:**
```bash
# Get first 10 reviews
GET /api/items/1/reviews

# Get reviews page 2
GET /api/items/1/reviews?limit=10&offset=10

# Get first 5 reviews
GET /api/items/1/reviews?limit=5
```

**Success Response (200 OK):**
```json
[
  {
    "id": 1,
    "item_id": 1,
    "user_id": 123,
    "rating": 5,
    "title": "Excellent quality!",
    "body": "These apples are crisp and delicious. Highly recommend!",
    "created_at": "2025-10-14T12:00:00Z"
  },
  {
    "id": 2,
    "item_id": 1,
    "user_id": 456,
    "rating": 4,
    "title": "Good but pricey",
    "body": "Good quality apples but a bit expensive.",
    "created_at": "2025-10-13T15:30:00Z"
  }
]
```

**Response Fields:**
- `id` - Review ID
- `item_id` - Item being reviewed
- `user_id` - User who wrote review
- `rating` - Rating (1-5)
- `title` - Review title (optional)
- `body` - Review text
- `created_at` - Timestamp

**Error Responses:**
- `404 Not Found` - Item doesn't exist

---

### 2. Create/Update Review

Create a new review or update existing review for an item.

**Authentication Required:** Yes

**Endpoint:** `POST /api/items/{item_id}/reviews`

**Path Parameters:**
- `item_id` (integer, required) - Item ID

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "rating": 5,
  "title": "Excellent!",
  "body": "These apples are amazing. Fresh and crispy!"
}
```

**Request Fields:**
- `rating` (integer, required) - Rating from 1 to 5
- `title` (string, optional) - Review title
- `body` (string, required) - Review text (min 5 characters)

**Success Response (201 Created):**
```json
{
  "ok": true
}
```

**Behavior:**
- **Updates** review if user already reviewed this item
- **Creates** new review if user hasn't reviewed this item
- Automatically recalculates item's `avg_rating` and `ratings_count`

**Error Responses:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - Item doesn't exist or is inactive
- `422 Unprocessable Entity` - Invalid input (rating out of range, body too short)

**Example Request:**
```bash
curl -X POST http://localhost:8000/api/items/1/reviews \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "title": "Great!", "body": "Highly recommend"}'
```

---

## 📊 Response Formats & Error Handling

### Data Format Conventions

#### Price Format
- Prices are stored in **cents** (integer)
- To display: `price_cents / 100`
- Example: `399` → `$3.99`

#### Rating Format
- `avg_rating` is a float (0.0 to 5.0)
- Display with 1-2 decimal places
- Example: `4.666666666666667` → `4.67`

#### Date Format
- All dates are ISO 8601 format
- Example: `"2025-10-14T12:00:00Z"`
- JavaScript: `new Date(created_at).toLocaleDateString()`

#### Null Values
- `image_url` may be `null` (no image)
- `category` may be `null`
- `full_name` may be `null`
- Always check for null before displaying

---

### Error Responses

#### 400 Bad Request
```json
{
  "detail": "Email already registered"
}
```
- Client error (duplicate, invalid data)

#### 401 Unauthorized
```json
{
  "detail": "invalid_token"
}
```
- Missing, invalid, or expired authentication

#### 403 Forbidden
```json
{
  "detail": "User account is inactive"
}
```
- Authenticated but not authorized

#### 404 Not Found
```json
{
  "detail": "not_found"
}
```
- Resource doesn't exist

#### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "rating"],
      "msg": "ensure this value is greater than or equal to 1",
      "type": "value_error.number.not_ge"
    }
  ]
}
```
- Request validation failed

---

## 🔧 Environment Variables

Required environment variables:

```bash
# Authentication (Required for production)
SECRET_KEY=your-secret-key-here

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Token Expiration (Optional, default: 1440 minutes = 24 hours)
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

---

## 🧪 Testing

### Manual Testing with curl

```bash
# Health check
curl http://localhost:8000/healthz

# Sign up
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Get current user
curl http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search items
curl "http://localhost:8000/api/search?q=apple&limit=5"

# List items by category
curl "http://localhost:8000/api/items?group_by=category"

# Get item details
curl http://localhost:8000/api/items/1

# Get reviews
curl http://localhost:8000/api/items/1/reviews

# Create review
curl -X POST http://localhost:8000/api/items/1/reviews \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "body": "Excellent product!"}'
```

### Automated Tests

```bash
# Run all tests
pytest tests/ -v

# Run auth tests only
pytest tests/test_auth.py -v

# Run items tests only
pytest tests/test_items.py -v

# Run specific test
pytest tests/test_auth.py::test_signup_success -v
```

---

## 📝 API Summary

### Authentication
- ✅ `POST /api/auth/signup` - Register new user
- ✅ `POST /api/auth/login` - Login with email/password
- ✅ `POST /api/auth/google` - Google OAuth login
- ✅ `GET /api/auth/me` - Get current user

### Items/Products
- ✅ `GET /api/items?group_by={field}` - List items grouped
- ✅ `GET /api/items/{id}` - Get item details
- ✅ `GET /api/search?q={query}` - Search with autocomplete

### Reviews
- ✅ `GET /api/items/{id}/reviews` - Get item reviews
- ✅ `POST /api/items/{id}/reviews` - Create/update review (auth required)

### System
- ✅ `GET /healthz` - Health check

---

## 🔒 Security Best Practices

1. **HTTPS in Production** - Always use HTTPS to protect tokens
2. **Secure Token Storage** - Use httpOnly cookies or secure storage
3. **Password Requirements** - Minimum 8 characters enforced
4. **Token Expiration** - Tokens expire after 24 hours
5. **Password Hashing** - bcrypt with secure salt rounds
6. **Environment Variables** - Never commit secrets to git
7. **CORS Configuration** - Restrict allowed origins in production

---

## 📚 Additional Resources

- **Test Files**: `tests/test_auth.py`, `tests/test_items.py`
- **Backend Documentation**: `backend/readme.md`
- **Search Implementation**: `backend/docs/SEARCH_SUMMARY.md`
- **Authentication Details**: `AUTHENTICATION_INTEGRATION.md`

---

## 🎉 All APIs are Fully Functional and Tested!

For issues or questions, refer to the test files which demonstrate all API flows.

