# Order Management System

## Overview

The admin panel now includes comprehensive order management capabilities, allowing administrators to view, filter, and manage all customer orders in the system.

## Features

### Backend Features

1. **List Orders** - View all orders with advanced filtering
2. **Order Details** - Get complete order information including items
3. **Status Management** - Update order delivery status
4. **Search & Filter** - Find orders by ID, email, payment intent, date range, and status

### Frontend Features

1. **Order Dashboard** - Visual statistics for orders (total, pending, delivered)
2. **Advanced Filters** - Search, status, and date range filtering
3. **Order Table** - Sortable list with key information
4. **Detail Modal** - View complete order information with items
5. **Status Toggle** - Quick delivery status updates
6. **Real-time Stats** - Live order counts and status breakdown

## API Endpoints

### 1. List Orders
```
GET /api/admin/orders
```

**Query Parameters:**
- `query` (string, optional) - Search by order ID, user email, or payment intent ID
- `status_filter` (string, optional) - Filter by status: "all", "delivered", "pending" (default: "all")
- `user_id` (integer, optional) - Filter by specific user ID
- `from_date` (string, optional) - Filter orders from date (ISO format: 2025-01-01T00:00:00Z)
- `to_date` (string, optional) - Filter orders to date (ISO format: 2025-12-31T23:59:59Z)
- `limit` (integer, optional) - Maximum results (1-200, default: 50)
- `offset` (integer, optional) - Pagination offset (default: 0)

**Example Requests:**
```bash
# Get all orders
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/admin/orders

# Get pending orders
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/admin/orders?status_filter=pending

# Search by email
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/admin/orders?query=user@example.com"

# Filter by date range
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/admin/orders?from_date=2025-01-01T00:00:00Z&to_date=2025-01-31T23:59:59Z"
```

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 5,
    "user_email": "customer@example.com",
    "user_full_name": "John Doe",
    "total_cents": 4500,
    "total_items": 3,
    "created_at": "2025-11-02T10:30:00Z",
    "delivered_at": null,
    "payment_intent_id": "pi_abc123",
    "is_delivered": false
  }
]
```

### 2. Get Order Details
```
GET /api/admin/orders/{order_id}
```

**Example Request:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/admin/orders/1
```

**Response:**
```json
{
  "id": 1,
  "user": {
    "id": 5,
    "email": "customer@example.com",
    "full_name": "John Doe"
  },
  "items": [
    {
      "id": 1,
      "quantity": 2,
      "item_id": 10,
      "item_name": "Organic Apples",
      "item_price_cents": 599,
      "item_image_url": "/images/items/apples.jpg"
    }
  ],
  "total_cents": 4500,
  "total_weight_oz": 64,
  "created_at": "2025-11-02T10:30:00Z",
  "delivered_at": null,
  "payment_intent_id": "pi_abc123",
  "is_delivered": false
}
```

### 3. Update Order Status
```
PUT /api/admin/orders/{order_id}/status
```

**Request Body:**
```json
{
  "delivered": true
}
```

**Example Request:**
```bash
# Mark as delivered
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delivered": true}' \
  http://localhost:8080/api/admin/orders/1

# Mark as pending
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delivered": false}' \
  http://localhost:8080/api/admin/orders/1
```

**Response:**
```json
{
  "ok": true,
  "message": "Order marked as delivered",
  "order_id": 1,
  "delivered_at": "2025-11-02T15:45:00Z"
}
```

## Frontend Usage

### Accessing Order Management

1. Login as admin (admin@sjsu.edu / admin123)
2. Navigate to Admin Panel
3. Click "Orders" in the navigation menu or "Manage Orders" in Quick Actions

### Dashboard Integration

The admin dashboard now shows:
- **Order Statistics Section** - Total orders, pending, and delivered counts
- **Quick Action Card** - "Manage Orders" for quick access
- **System Statistics** - Total orders count alongside users and items

### Order Management Page

**Filters:**
- Search by order ID, email, or payment intent ID
- Filter by status (All, Pending, Delivered)
- Filter by date range (From/To dates)
- Apply and clear filters

**Order Table:**
- Order ID
- Customer email and name
- Number of items
- Total amount
- Created date
- Status badge (Pending/Delivered)
- Actions (View details, Toggle status)

**Order Details Modal:**
- Customer information (email, name)
- Order information (created date, status, delivered date, payment ID)
- All order items with images, quantities, and prices
- Total amount and weight
- Action buttons (Close, Toggle delivery status)

## Security

- All endpoints require admin role authentication
- JWT token validation on every request
- Returns 403 Forbidden if non-admin attempts access
- Audit trail through created_at and delivered_at timestamps

## Database Schema

The implementation uses existing database tables:
- `orders` - Order records with user_id, payment_intent_id, delivered_at
- `order_items` - Order line items with quantity and item_id
- `users` - Customer information
- `items` - Product details

No database migrations required - uses existing schema.

## Error Handling

- **400 Bad Request** - Invalid date format in filters
- **401 Unauthorized** - Missing or invalid JWT token
- **403 Forbidden** - Non-admin user attempting access
- **404 Not Found** - Order not found

## Testing

### Manual Testing Steps

1. **Start Backend Server:**
```bash
cd backend
python -m uvicorn app.main:app --reload
```

2. **Login as Admin:**
   - Navigate to http://localhost:3000/login
   - Login with admin@sjsu.edu / admin123

3. **Test Dashboard:**
   - Verify order statistics are displayed
   - Check counts for total, pending, and delivered orders
   - Click on order stats to navigate to filtered views

4. **Test Order List:**
   - Navigate to /admin/orders
   - Verify orders are displayed in table
   - Test search functionality
   - Test status filter (all, pending, delivered)
   - Test date range filters

5. **Test Order Details:**
   - Click "View" on any order
   - Verify modal displays complete order information
   - Check customer details
   - Verify items are displayed with correct data
   - Confirm totals are accurate

6. **Test Status Updates:**
   - Click "Mark Delivered" on a pending order
   - Confirm status updates in table
   - Verify delivered_at timestamp is set
   - Test reverting to pending
   - Confirm delivered_at is cleared

### Automated Testing

Create orders and test via API:
```bash
# Login as admin and get token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sjsu.edu","password":"admin123"}' \
  | jq -r '.access_token')

# List all orders
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/admin/orders

# Get specific order
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/admin/orders/1

# Update order status
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"delivered": true}' \
  http://localhost:8080/api/admin/orders/1
```

## Future Enhancements

Potential additions for future development:
- Export orders to CSV
- Bulk status updates
- Order refund/cancellation
- Tracking numbers and shipping labels
- Email notifications for status changes
- Order history timeline
- Advanced analytics (revenue trends, popular items)
- Customer order history view
- Order notes/comments
- Print-friendly order views for packing slips

## Files Modified/Created

### Backend Files Created:
- Order management schemas added to `backend/app/schemas.py`
- Order management endpoints added to `backend/app/routers/admin.py`

### Frontend Files Created:
- `frontend/src/app/admin/orders/page.tsx` - Order management page

### Frontend Files Modified:
- `frontend/src/app/admin/layout.tsx` - Added Orders to navigation
- `frontend/src/app/admin/dashboard/page.tsx` - Added order statistics
- `frontend/src/lib/api/admin.ts` - Added order management API functions

### Documentation Files Created:
- `docs/ORDER_MANAGEMENT.md` - This file

## Support

For issues or questions:
1. Check backend logs for API errors
2. Check browser console for frontend errors
3. Verify admin authentication is working
4. Ensure orders exist in database
5. Confirm backend server is running on port 8080
6. Confirm frontend server is running on port 3000

## Summary

The order management system provides administrators with complete visibility and control over customer orders. The implementation follows the same patterns as existing admin features (users, inventory) for consistency and maintainability. All endpoints are secured with admin-only access, and the UI provides an intuitive interface for managing orders efficiently.

