# Admin Role-Based Access Control System

## Overview

This application now includes a comprehensive role-based access control (RBAC) system with four user categories:
- **Admin**: Full system access with user management and inventory control (**single admin only**)
- **Employee**: Limited access (to be defined in future sprints)
- **Manager**: Moderate access (to be defined in future sprints)
- **Customer**: Standard user access to shop and purchase items

**Important:** This system implements a **single administrator model**. Only one admin account exists in the system, created during database initialization. The admin cannot delegate admin privileges to other users, ensuring clear authority and preventing administrative conflicts.

## User Roles

### Admin (Single Admin Model)
The administrator has complete control over the system. **Only one admin exists** in the system:
- **User Management**:
  - View all users in the system
  - Promote or demote users to non-admin roles (manager, employee, customer)
  - Block or unblock user accounts permanently
  - Cannot modify their own role or block themselves
  - Cannot create additional admins (single admin architecture)
  
- **Inventory Management**:
  - Create new items with all details (name, price, weight, description, images, nutrition info, stock, etc.)
  - Update existing items (all fields are editable)
  - Add/edit nutrition information as JSON (optional)
  - Deactivate items (soft delete - sets `is_active` to False)
  - Reactivate previously deactivated items
  - Search and filter inventory by:
    - Name or description
    - Category
    - Status (active/inactive/all)
    - Stock level (low stock alerts)
  - View both active and inactive items

- **Customer View Mode**:
  - Admin can switch to "Customer View" to experience the site as a regular customer
  - A green banner appears at the top indicating customer view mode
  - Quick "Exit to Admin" button to return to admin panel

### Manager, Employee, Customer
These roles are currently set up in the database but have the same permissions as customers. Future sprints will define specific permissions for these roles.

**Role Assignment:**
- New users are automatically assigned the "customer" role upon signup
- The admin can promote customers to "manager" or "employee" roles
- The admin cannot create additional admin accounts (enforced by backend and frontend)
- This single-admin model reflects a typical small business structure where one owner has ultimate authority

## Default Admin Credentials

For development and testing purposes, an admin account is automatically created when you run the seed script:

```
Email: admin@sjsu.edu
Password: admin123
```

**Important**: Change these credentials in production!

## Setup Instructions

### 1. Database Migration

The system adds a `role` field to the users table. To update your database:

```bash
# Delete the old database (DEVELOPMENT ONLY)
rm backend/sqlite.db

# Run the seed script to create tables and admin user
python -m backend.app.seed
```

### 2. Verify Admin Account

After running the seed script, you should see:
```
✓ Admin user created: admin@sjsu.edu / admin123
✓ Seeded 24 items
```

### 3. Login as Admin

1. Start the backend and frontend servers
2. Navigate to the login page
3. Use the admin credentials above
4. You will be automatically redirected to `/admin/dashboard`

## Admin Interface

### Dashboard (`/admin/dashboard`)
- Overview statistics:
  - Total users, items, active/inactive items
  - Low stock alerts
  - User role breakdown
- Quick action links to user and inventory management
- Link to preview customer view

### User Management (`/admin/users`)
- Table view of all users with:
  - Email and name
  - Current role (admin shown as badge, others have dropdown)
  - Active/blocked status
  - Account creation date
- Filter users by:
  - All users
  - By role (admin, manager, employee, customer)
  - By status (active, blocked)
- Actions:
  - Change user role to manager, employee, or customer
  - Block/unblock user accounts
  - Protections: 
    - Admin cannot modify their own role or block themselves
    - Cannot promote anyone to admin (single admin model)
    - Admin role displayed as non-editable badge

### Inventory Management (`/admin/inventory`)
- Grid view of all items with images and details
- Search functionality by name or description
- Filter by status (defaults to active items only)
- Each item card shows:
  - Image, name, category
  - Price, weight, stock quantity, rating
  - Active/inactive status
  - Low stock indicator (≤10 items)
- Actions:
  - Create new item (modal form with all fields including optional nutrition JSON)
  - Edit existing item (modal form with all fields)
  - Add/edit nutrition information in JSON format (optional)
  - Deactivate item (soft delete)
  - Reactivate inactive item

## API Endpoints

### User Management Endpoints
```
GET    /api/admin/users                    - List all users
PUT    /api/admin/users/{id}/role          - Update user role
PUT    /api/admin/users/{id}/block         - Block/unblock user
```

### Inventory Management Endpoints
```
GET    /api/admin/items                    - List items (with filters)
GET    /api/admin/items/{id}               - Get single item
POST   /api/admin/items                    - Create new item
PUT    /api/admin/items/{id}               - Update item
DELETE /api/admin/items/{id}               - Deactivate item
PUT    /api/admin/items/{id}/activate      - Activate/deactivate item
```

All admin endpoints require:
- Valid JWT authentication token
- User role must be "admin"
- Returns 403 Forbidden if non-admin attempts access

## Changes from Previous Version

### Backend Changes

1. **Database Schema** (`backend/app/models.py`):
   - Added `role` field to `User` model (String, default: "customer")
   - Indexed for performance on role-based queries

2. **Authentication** (`backend/app/auth.py`):
   - Updated `UserCtx` to include `role` field
   - Added `require_admin()` dependency for admin-only routes
   - Added `require_role()` factory function for flexible role checking

3. **New Admin Router** (`backend/app/routers/admin.py`):
   - Complete admin API with user management and inventory CRUD
   - All endpoints protected with `require_admin()` dependency
   - Prevents admin from modifying their own role or blocking themselves

4. **Schemas** (`backend/app/schemas.py`):
   - Updated `UserOut` to include `role`
   - Added `UserListAdmin`, `UserRoleUpdate`, `UserBlockUpdate`
   - Added `ItemCreate`, `ItemUpdate`, `ItemActivateUpdate`

5. **Seed Script** (`backend/app/seed.py`):
   - Automatically creates admin user with hardcoded credentials
   - Checks if admin exists before creating (idempotent)

### Frontend Changes

1. **Auth Context** (`frontend/src/contexts/auth.tsx`):
   - Already supported role field in UserInfo interface

2. **API Client** (`frontend/src/lib/api/admin.ts`):
   - New admin API client with all user and inventory management functions
   - Type-safe interfaces for all requests and responses

3. **Admin Dashboard** (`frontend/src/app/admin/`):
   - Complete admin interface with layout, dashboard, users, and inventory pages
   - Role-based route protection (redirects non-admins)
   - Responsive design with dark mode support

4. **Customer View Feature** (`frontend/src/app/home/layout.tsx`):
   - Green banner shows when admin is viewing as customer
   - Quick "Exit to Admin" button
   - Seamless switching between admin and customer views

## Security Considerations

1. **Authentication**: All admin endpoints require valid JWT tokens
2. **Authorization**: Role checked on every admin request
3. **Single Admin Model**: Only one admin can exist in the system
   - Prevents administrative conflicts and "admin wars"
   - Clear chain of command and accountability
   - Admin cannot delegate admin privileges
4. **Self-Protection**: Admin cannot demote or block themselves
5. **Soft Deletes**: Items are deactivated, not permanently deleted
6. **Audit Trail**: All user records retain created_at and updated_at timestamps

## Future Enhancements

Potential additions for future sprints:
- Audit logging (track who changed what and when)
- Admin analytics dashboard (sales, popular items, user activity)
- Bulk operations (bulk role changes, bulk item updates)
- Export functionality (user list, inventory report)
- Advanced filtering and sorting options
- Image upload for inventory items
- Role-specific permissions for manager and employee roles

