# Employee Role Implementation

## Overview

This document describes the complete implementation of the Employee role capabilities in the OFS (Organic Food Store) system. The employee role has been designed as a proper subset of manager permissions, focusing on specific daily operational tasks.

## Implementation Date

November 12, 2025

## Table of Contents

1. [Backend Implementation](#backend-implementation)
2. [Frontend Implementation](#frontend-implementation)
3. [Access Control](#access-control)
4. [API Endpoints](#api-endpoints)
5. [Testing](#testing)
6. [User Experience](#user-experience)

---

## Backend Implementation

### 1. Employee Router (`backend/app/routers/employee.py`)

Created a dedicated router with employee-specific endpoints that enforce proper access control.

#### Inventory Management Endpoints

- **`GET /api/employee/items`** - View full product inventory
  - Supports filtering by: category, status (active/inactive/all), low stock threshold
  - Supports search by: name or description
  - Includes pagination
  - Returns: List of items with all details including stock quantity

- **`GET /api/employee/categories`** - Get all unique categories
  - Returns: List of category names

- **`GET /api/employee/items/{item_id}`** - Get single item details
  - Returns: Full item details including inactive items

- **`PUT /api/employee/items/{item_id}/stock`** - Update stock quantity ONLY
  - Request body: `{ "stock_qty": number }`
  - **Restriction**: Can ONLY update `stock_qty`, no other fields
  - Creates audit log entry for stock updates
  - Returns: Updated item

#### Order Management Endpoints (Read-Only)

- **`GET /api/employee/orders`** - View all customer orders
  - Supports filtering by: status (all/delivered/pending), user_id, date range
  - Supports search by: order ID, email, or payment intent ID
  - Includes pagination
  - Returns: List of orders with summary information
  - **Restriction**: Read-only access, cannot modify orders

- **`GET /api/employee/orders/{order_id}`** - Get detailed order information
  - Returns: Complete order details including items and customer info
  - **Restriction**: Read-only access

### 2. Schemas (`backend/app/schemas.py`)

Added employee-specific schemas:

```python
class ItemStockUpdate(BaseModel):
    """Schema for updating item stock quantity (employee-only field)"""
    stock_qty: conint(ge=0)

class OrderListEmployee(BaseModel):
    """Schema for employee order list view (read-only)"""
    # Includes: id, user info, totals, timestamps, delivery status

class OrderDetailEmployee(BaseModel):
    """Schema for employee order detail view (read-only)"""
    # Includes: full order details, items, user info, totals
```

### 3. Authentication (`backend/app/auth.py`)

The existing `require_employee()` dependency function is used to enforce access control:

```python
def require_employee(current_user: UserCtx = Depends(get_current_user)) -> UserCtx:
    """
    Dependency to require employee role (or higher).
    Raises 403 if user is not an employee, manager, or admin.
    """
```

This allows employees, managers, and admins to access employee endpoints.

### 4. Audit Logging

All employee actions are logged:
- Stock quantity updates include: old value, new value, actor role, timestamp
- Action type: `"item_stock_updated"`
- Includes IP address and actor information

---

## Frontend Implementation

### 1. API Client (`frontend/src/lib/api/employee.ts`)

Created TypeScript API client with functions for all employee operations:

```typescript
// Inventory Management
- listItems(token, params): Promise<ItemEmployee[]>
- getCategories(token): Promise<string[]>
- getItem(token, itemId): Promise<ItemEmployee>
- updateItemStock(token, itemId, stockQty): Promise<ItemEmployee>

// Order Management (Read-Only)
- listOrders(token, params): Promise<OrderListEmployee[]>
- getOrderDetail(token, orderId): Promise<OrderDetailEmployee>
```

### 2. Employee Dashboard (`frontend/src/app/employee/dashboard/page.tsx`)

Features:
- Welcome message with user name and role
- Statistics cards:
  - Total items in inventory
  - Low stock items (≤10 units)
  - Out of stock items (0 units)
- Quick action buttons:
  - Query Inventory
  - Update Stock Quantity
  - View Orders
  - View Low-Stock Alerts
- Permission summary box showing what employees can/cannot do
- Automatic redirect if not authenticated or not authorized

### 3. Inventory Page (`frontend/src/app/employee/inventory/page.tsx`)

Features:
- View all products with filtering and search
- Filter by: category, status (In Stock/Low Stock/Out of Stock)
- Search by: product name or ID
- Display: product image, name, ID, quantity, status
- Real-time status calculation based on stock quantity
- Error handling and retry functionality
- **Read-only**: No ability to modify prices or other item fields

### 4. Stock Management Page (`frontend/src/app/employee/stock-management/page.tsx`)

Features:
- View and filter products (same as inventory page)
- **Update Quantity** modal with:
  - Current quantity display
  - Increment/decrement buttons
  - Manual input with validation (digits only, minimum 0)
  - Save/Cancel actions
  - Loading state during save
- **Mark Out of Stock** button (sets quantity to 0)
- Real-time API integration
- Optimistic UI updates
- Error handling with user feedback

### 5. Orders Page (`frontend/src/app/employee/orders/page.tsx`)

Features:
- View all customer orders in a table format
- Filter by: status (all/pending/delivered)
- Search by: order ID, customer email, or payment intent ID
- Display: order ID, customer info, item count, total, created date, status
- Status badges (Delivered/Pending)
- **Read-only**: No ability to modify order status
- Informational note explaining read-only access
- Pagination support

### 6. Employee Layout (`frontend/src/app/employee/layout.tsx`)

Features:
- Sidebar navigation with only authorized links:
  - Dashboard
  - Inventory
  - Stock Management
  - Orders
  - Alerts
- Removed unauthorized links (Settings, Notifications)
- User information display showing logged-in user and role
- Working Sign Out button
- Consistent styling with admin/manager layouts

### 7. Authentication Redirect (`frontend/src/app/login/page.tsx`)

Updated login logic to redirect employees to their dashboard:

```typescript
if (response.user.role === 'employee') {
    router.push("/employee/dashboard");
}
```

Applied to both regular login and Google OAuth login.

---

## Access Control

### What Employees CAN Do:

✓ **Inventory Management (Limited)**
  - View full product inventory
  - Update stock quantities for items
  - View product categories
  - Search and filter inventory
  - View low-stock and out-of-stock items

✓ **Order Management (Read-Only)**
  - View all customer orders
  - View detailed order information
  - Search and filter orders
  - See order status and history

### What Employees CANNOT Do:

✗ **Inventory Restrictions**
  - Cannot create new items
  - Cannot delete items
  - Cannot modify prices
  - Cannot modify item names, descriptions, images, or videos
  - Cannot activate/deactivate items

✗ **Order Restrictions**
  - Cannot change order status (mark as delivered/pending)
  - Cannot modify order details
  - Cannot delete orders

✗ **System Administration**
  - No access to User Management pages or APIs
  - No access to Audit Logs pages or APIs
  - Cannot promote/demote users
  - Cannot block/unblock users
  - Cannot view system reports

---

## API Endpoints

### Employee-Specific Endpoints

All employee endpoints require authentication with Bearer token and employee/manager/admin role.

#### Inventory Management

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/employee/items` | List all items with filtering | Query params | `ItemEmployee[]` |
| GET | `/api/employee/categories` | Get all categories | None | `string[]` |
| GET | `/api/employee/items/{id}` | Get item details | None | `ItemEmployee` |
| PUT | `/api/employee/items/{id}/stock` | Update stock only | `{ stock_qty: number }` | `ItemEmployee` |

#### Order Management

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/employee/orders` | List all orders with filtering | Query params | `OrderListEmployee[]` |
| GET | `/api/employee/orders/{id}` | Get order details | None | `OrderDetailEmployee` |

### Query Parameters

#### Items Filtering

- `query` (string): Search by name or description
- `category` (string): Filter by category
- `status` ('active'|'inactive'|'all'): Filter by status
- `low_stock_threshold` (number): Filter items with stock below threshold
- `limit` (number, 1-200): Maximum results per page
- `offset` (number): Pagination offset

#### Orders Filtering

- `query` (string): Search by order ID, email, or payment intent
- `status_filter` ('all'|'delivered'|'pending'): Filter by delivery status
- `user_id` (number): Filter by customer ID
- `from_date` (ISO string): Filter from date
- `to_date` (ISO string): Filter to date
- `limit` (number, 1-200): Maximum results per page
- `offset` (number): Pagination offset

---

## Testing

### Manual Testing Checklist

#### Backend Testing

1. **Authentication**
   - [ ] Employee users can authenticate
   - [ ] Non-employee users are rejected from employee endpoints
   - [ ] JWT tokens work correctly

2. **Inventory Endpoints**
   - [ ] Can view all items
   - [ ] Can update stock quantity
   - [ ] Cannot update other fields (test by trying to modify price)
   - [ ] Filtering works correctly
   - [ ] Search works correctly
   - [ ] Pagination works correctly

3. **Order Endpoints**
   - [ ] Can view all orders
   - [ ] Can view order details
   - [ ] Filtering works correctly
   - [ ] Search works correctly
   - [ ] Cannot modify order status (no endpoint available)

4. **Audit Logging**
   - [ ] Stock updates create audit log entries
   - [ ] Audit logs include correct information

#### Frontend Testing

1. **Login & Navigation**
   - [ ] Employee login redirects to employee dashboard
   - [ ] Non-employees cannot access employee pages
   - [ ] Sidebar shows only authorized links

2. **Dashboard**
   - [ ] Stats display correctly
   - [ ] Quick actions work
   - [ ] User info displays correctly

3. **Inventory Page**
   - [ ] Products load correctly
   - [ ] Filtering works
   - [ ] Search works
   - [ ] Status badges display correctly

4. **Stock Management**
   - [ ] Can update quantities
   - [ ] Mark OOS works
   - [ ] Modal validation works
   - [ ] API errors are handled
   - [ ] Optimistic updates work

5. **Orders Page**
   - [ ] Orders load correctly
   - [ ] Filtering works
   - [ ] Search works
   - [ ] Read-only access is enforced

### Testing with cURL

```bash
# Login as employee
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"employee@example.com","password":"password123"}'

# Get token from response, then:
TOKEN="your_token_here"

# List items
curl -X GET "http://localhost:8000/api/employee/items?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Update stock quantity
curl -X PUT "http://localhost:8000/api/employee/items/1/stock" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"stock_qty": 50}'

# List orders
curl -X GET "http://localhost:8000/api/employee/orders?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Get order details
curl -X GET "http://localhost:8000/api/employee/orders/1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## User Experience

### Employee Workflow

1. **Login**
   - Employee logs in with email/password or Google OAuth
   - Automatically redirected to `/employee/dashboard`

2. **View Dashboard**
   - See overview of inventory status
   - Quick access to common tasks
   - View permission summary

3. **Manage Stock**
   - Navigate to "Stock Management"
   - Search/filter products
   - Update quantities as needed
   - Mark items out of stock when empty

4. **View Inventory**
   - Navigate to "Inventory"
   - Query products with filters
   - View detailed product information

5. **View Orders**
   - Navigate to "Orders"
   - View all customer orders
   - Search for specific orders
   - Filter by status
   - View order details (read-only)

6. **Sign Out**
   - Click "Sign Out" button in sidebar
   - Redirected to login page

### UI Design Considerations

- **Consistent Layout**: Employee interface matches admin/manager design patterns
- **Clear Permissions**: Permission summary visible on dashboard
- **Read-Only Indicators**: Orders page shows notice about read-only access
- **Status Visualization**: Color-coded status badges for inventory and orders
- **Error Handling**: Clear error messages with retry options
- **Loading States**: Loading indicators for async operations
- **Responsive Design**: Works on different screen sizes

---

## File Structure

### Backend Files

```
backend/
├── app/
│   ├── routers/
│   │   └── employee.py          # Employee-specific endpoints
│   ├── schemas.py                # Added employee schemas
│   ├── auth.py                   # Authentication (no changes, uses existing)
│   └── models.py                 # No changes needed
```

### Frontend Files

```
frontend/src/
├── app/
│   ├── employee/
│   │   ├── layout.tsx            # Updated with proper navigation & sign out
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Updated with real API integration
│   │   │   └── dashboard.css     # Updated with new styles
│   │   ├── inventory/
│   │   │   └── page.tsx          # Updated with real API integration
│   │   ├── stock-management/
│   │   │   └── page.tsx          # Updated with real API integration
│   │   └── orders/
│   │       └── page.tsx          # NEW: Orders viewing page
│   └── login/
│       └── page.tsx              # Updated with employee redirect logic
├── lib/
│   └── api/
│       └── employee.ts           # NEW: Employee API client
└── contexts/
    └── auth.tsx                  # No changes (already compatible)
```

---

## Security Considerations

1. **Authentication Required**: All employee endpoints require valid JWT token
2. **Role-Based Access**: Endpoints check for employee/manager/admin role
3. **Limited Permissions**: Employees can only update stock_qty, nothing else
4. **Read-Only Orders**: No endpoints exist for employees to modify orders
5. **Audit Trail**: All stock updates are logged with actor information
6. **Input Validation**: Stock quantities validated (non-negative integers)
7. **Error Messages**: No sensitive information leaked in error responses

---

## Future Enhancements

Potential improvements for the employee role:

1. **Notifications**
   - Email alerts for low stock items
   - Push notifications for new orders

2. **Reports**
   - Personal activity reports
   - Stock update history

3. **Batch Operations**
   - Update multiple items' stock at once
   - Export inventory to CSV

4. **Advanced Filtering**
   - Save filter presets
   - Custom low stock thresholds per category

5. **Mobile App**
   - Dedicated mobile interface for stock management
   - Barcode scanning for quick updates

---

## Support & Troubleshooting

### Common Issues

**Issue**: Employee cannot login
- **Solution**: Verify user has role='employee' in database
- **Solution**: Check password is correct
- **Solution**: Ensure user is_active=True

**Issue**: "Access denied" errors
- **Solution**: Verify JWT token is being sent in Authorization header
- **Solution**: Check token hasn't expired
- **Solution**: Confirm user role is employee/manager/admin

**Issue**: Stock updates not saving
- **Solution**: Check network connection
- **Solution**: Verify backend is running
- **Solution**: Check console for error messages
- **Solution**: Ensure stock_qty is non-negative integer

**Issue**: Orders not loading
- **Solution**: Verify employee has access to orders endpoint
- **Solution**: Check if there are any orders in database
- **Solution**: Try without filters first

---

## Conclusion

The employee role implementation provides a secure, user-friendly interface for daily operational tasks while maintaining strict access controls. Employees can efficiently manage inventory stock levels and view order information without access to sensitive administrative functions.

The implementation follows best practices:
- Separation of concerns (dedicated endpoints, clear boundaries)
- Security first (authentication, authorization, validation)
- User experience (clear UI, helpful feedback, error handling)
- Maintainability (clean code, documentation, audit logging)
- Scalability (pagination, filtering, efficient queries)

This foundation can be extended with additional features as business needs evolve.

