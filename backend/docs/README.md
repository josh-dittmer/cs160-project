# Backend API Documentation

Welcome to the OFS (Online Food Store) API documentation! This directory contains comprehensive documentation for all backend APIs.

---

## 📚 Documentation Index

### 🚀 Quick Start Guides

1. **[FRONTEND_INTEGRATION.md](api/FRONTEND_INTEGRATION.md)** ⭐ **START HERE FOR FRONTEND**
   - Complete guide for frontend integration
   - React/Next.js component examples
   - Authentication setup (signup, login, Google OAuth)
   - Step-by-step implementation guide
   - Token management and protected routes

### 🔐 Authentication APIs

2. **[AUTH_API.md](api/AUTH_API.md)**
   - Authentication endpoint reference
   - Signup, login, Google OAuth endpoints
   - JWT token usage
   - Request/response examples
   - Error handling

### 🛒 Items APIs

3. **[ITEMS_API.md](api/ITEMS_API.md)**
   - Items endpoint reference
   - Browsing and scrolling products
   - Item details and reviews
   - Search, filtering, and pagination
   - React/Next.js examples for product lists

### ✅ Verification & Testing

4. **[VERIFICATION_REPORT.md](api/VERIFICATION_REPORT.md)**
   - Complete test results
   - API verification report
   - Security audit
   - Deployment checklist
   - Performance metrics
   - Implementation details

---

## 🎯 Use Cases

### For Frontend Developers

**Setting up authentication?**
→ Read [FRONTEND_INTEGRATION.md](api/FRONTEND_INTEGRATION.md)

**Need API endpoints reference?**
→ Read [AUTH_API.md](api/AUTH_API.md) and [ITEMS_API.md](api/ITEMS_API.md)

**Building product listing pages?**
→ Read [ITEMS_API.md](api/ITEMS_API.md)

### For Backend Developers

**Understanding the implementation?**
→ Read [AUTHENTICATION_SUMMARY.md](api/AUTHENTICATION_SUMMARY.md)

**Checking test coverage?**
→ Read [VERIFICATION_REPORT.md](api/VERIFICATION_REPORT.md)

### For Project Managers

**What features are implemented?**
→ Read [VERIFICATION_REPORT.md](api/VERIFICATION_REPORT.md)

---

## 📋 API Endpoints Summary

### Authentication Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Register new user |
| `/api/auth/login` | POST | Login with email/password |
| `/api/auth/google` | POST | Login with Google OAuth |
| `/api/auth/me` | GET | Get current user info |

### Items Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/items?group_by={field}` | GET | List items grouped by field (category, price, name) |
| `/api/items/{id}` | GET | Get item details |
| `/api/items/{id}/reviews` | GET | Get item reviews |
| `/api/items/{id}/reviews` | POST | Create/update review (auth required) |

### Utility Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/healthz` | GET | Health check |

---

## 🚀 Quick Examples

### Authentication

```typescript
// Signup
const response = await fetch('http://localhost:8000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepass123',
    full_name: 'John Doe'
  })
});
const { access_token, user } = await response.json();
```

### Items Browsing

```typescript
// Get items grouped by category
const response = await fetch('http://localhost:8000/api/items?group_by=category');
const itemsByCategory = await response.json();
// Returns: { "fruits": [...], "vegetables": [...], "meat": [...], "dairy": [...] }

// Get items grouped by price
const priceResponse = await fetch('http://localhost:8000/api/items?group_by=price');
const itemsByPrice = await priceResponse.json();
// Returns: { "under_$3": [...], "$3_to_$5": [...], "$5_to_$10": [...], "over_$10": [...] }

// Get item details
const detailResponse = await fetch('http://localhost:8000/api/items/1');
const item = await detailResponse.json();
```

### Using JWT Token

```typescript
// Make authenticated request
const response = await fetch('http://localhost:8000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
const currentUser = await response.json();
```

---

## 🔧 Setup & Configuration

### Environment Variables

```bash
# Required for production
SECRET_KEY=your-secret-key-here

# Required for Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id

# API URL (frontend)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
PYTHONPATH=. uvicorn backend.app.main:app --reload
```

### Running Tests

```bash
# All tests
PYTHONPATH=. pytest tests/ -v

# Authentication tests only
PYTHONPATH=. pytest tests/test_auth.py -v

# Items tests only
PYTHONPATH=. pytest tests/test_items.py -v
```

---

## 📊 Status

| Component | Status | Tests |
|-----------|--------|-------|
| Authentication APIs | ✅ Working | 13/13 passing |
| Items APIs | ✅ Working | 2/2 passing |
| JWT Token System | ✅ Working | Verified |
| Google OAuth | ⚙️ Ready | Requires config |
| Documentation | ✅ Complete | 6 documents |

---

## 🤝 Contributing

When adding new features:
1. Update the relevant API documentation
2. Add test cases
3. Update this README if adding new endpoints
4. Run all tests before committing

---

## 📞 Support

- **API Issues**: Check [VERIFICATION_REPORT.md](api/VERIFICATION_REPORT.md)
- **Integration Help**: See [FRONTEND_INTEGRATION.md](api/FRONTEND_INTEGRATION.md)
- **Authentication**: See [AUTH_API.md](api/AUTH_API.md)
- **Items/Products**: See [ITEMS_API.md](api/ITEMS_API.md)

---

## 📝 Document Version

- **Last Updated**: October 1, 2025
- **API Version**: 0.3.0
- **Documentation Version**: 1.0.0

---

**Happy Coding! 🚀**

