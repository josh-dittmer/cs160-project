# Manager Access Controls Implementation

## Overview
This document describes the access controls and permissions implemented for the Manager role in the system.

## Implementation Date
November 5, 2025

## Access Control Rules

### User Role Management
**Managers CANNOT change any user roles**
- Managers can view all users
- Managers cannot promote customers to employees
- Managers cannot demote employees to customers
- Managers cannot change any user's role
- Only admins can change user roles

**Backend Implementation:**
- Updated `can_modify_user_role()` in `backend/app/auth.py` to return `False` for managers
- Updated `update_user_role()` in `backend/app/routers/manager.py` to reject all role change requests from managers

**Frontend Implementation:**
- Updated `frontend/src/app/admin/users/page.tsx` to display all roles as non-editable badges for managers
- Added early return in `handleRoleChange()` to prevent managers from changing roles

### User Blocking
**Managers can ONLY block employees and customers**
- ✅ Managers can block employees
- ✅ Managers can block customers
- ❌ Managers CANNOT block other managers
- ❌ Managers CANNOT block admins
- ✅ Managers can unblock employees and customers

**Backend Implementation:**
- `can_block_user()` in `backend/app/auth.py` restricts managers to blocking only employees and customers
- `block_user()` in `backend/app/routers/manager.py` enforces these restrictions

### Audit Logs
**Managers have SAME permissions as admins**
- ✅ Managers can list all audit logs
- ✅ Managers can get audit log statistics
- ✅ Managers can filter audit logs by action type, actor, date, etc.

**Backend Implementation:**
- All audit log endpoints in `backend/app/routers/admin.py` use `require_manager` dependency
- Managers have full read access to audit logs

### Order Management
**Managers have SAME permissions as admins**
- ✅ Managers can list all orders
- ✅ Managers can view order details
- ✅ Managers can update order delivery status
- ✅ Managers can filter and search orders

**Backend Implementation:**
- All order management endpoints in `backend/app/routers/admin.py` use `require_manager` dependency
- Managers have full access to order management features

### Inventory Management
**Managers have SAME permissions as admins**
- ✅ Managers can list all items
- ✅ Managers can create new items
- ✅ Managers can update items
- ✅ Managers can activate/deactivate items
- ✅ Managers can permanently delete items
- ✅ Managers can view categories
- ✅ Managers can search and filter inventory

**Backend Implementation:**
- All inventory management endpoints in `backend/app/routers/admin.py` use `require_manager` dependency
- Managers have full access to inventory features

## Files Modified

### Backend
1. `backend/app/auth.py`
   - Updated `can_modify_user_role()` to prevent managers from changing any user roles
   - Made `stripe_customer_id` optional in `UserCtx` model for compatibility

2. `backend/app/routers/manager.py`
   - Updated `update_user_role()` endpoint to reject all manager role change requests

3. `backend/app/routers/admin.py`
   - All audit log, order, and inventory endpoints already use `require_manager` (no changes needed)

### Frontend
1. `frontend/src/app/admin/users/page.tsx`
   - Updated role display to show non-editable badges for managers
   - Added permission check in `handleRoleChange()` to prevent managers from changing roles
   - Blocking permissions already correctly implemented via `canManagerModifyUser()` helper

### Manager Pages (Already Using DRY Principle)
- `frontend/src/app/manager/users/page.tsx` - Reuses admin users component
- `frontend/src/app/manager/orders/page.tsx` - Reuses admin orders component
- `frontend/src/app/manager/audit-logs/page.tsx` - Reuses admin audit logs component
- `frontend/src/app/manager/inventory/page.tsx` - Reuses admin inventory component

## Testing

### Test Suite
Created comprehensive test suite in `backend/tests/test_manager_permissions.py` with 14 tests:

#### Role Change Tests (2 tests)
- ✅ `test_manager_cannot_change_roles` - Verifies managers cannot change any roles
- ✅ `test_admin_can_change_roles` - Verifies admins can still change roles

#### Blocking Tests (4 tests)
- ✅ `test_manager_can_block_employee` - Verifies managers can block employees
- ✅ `test_manager_can_block_customer` - Verifies managers can block customers
- ✅ `test_manager_cannot_block_another_manager` - Verifies managers cannot block managers
- ✅ `test_manager_cannot_block_admin` - Verifies managers cannot block admins

#### Audit Logs Tests (1 test)
- ✅ `test_manager_can_access_audit_logs` - Verifies managers can access audit logs

#### Orders Tests (2 tests)
- ✅ `test_manager_can_access_orders` - Verifies managers can list orders
- ✅ `test_manager_can_update_order_status` - Verifies managers can update order status

#### Inventory Tests (4 tests)
- ✅ `test_manager_can_access_inventory` - Verifies managers can access inventory
- ✅ `test_manager_can_create_items` - Verifies managers can create items
- ✅ `test_manager_can_update_items` - Verifies managers can update items
- ✅ `test_manager_can_deactivate_items` - Verifies managers can deactivate items

#### User List Access Tests (1 test)
- ✅ `test_manager_can_list_all_users` - Verifies managers can list all users for UI

### Test Results
All 14 tests passing ✅

## Summary of Permissions

| Feature | Manager | Admin |
|---------|---------|-------|
| Change user roles | ❌ No | ✅ Yes |
| Block employees | ✅ Yes | ✅ Yes |
| Block customers | ✅ Yes | ✅ Yes |
| Block managers | ❌ No | ✅ Yes |
| Block admins | ❌ No | ❌ No (cannot block themselves) |
| View audit logs | ✅ Yes (same as admin) | ✅ Yes |
| Manage orders | ✅ Yes (same as admin) | ✅ Yes |
| Manage inventory | ✅ Yes (same as admin) | ✅ Yes |
| View all users | ✅ Yes | ✅ Yes |

## Security Considerations

1. **Backend Enforcement**: All access controls are enforced at the backend level, not just in the UI
2. **Frontend Guards**: UI elements are hidden/disabled for unauthorized actions
3. **Audit Trail**: All manager actions are logged in audit logs
4. **Principle of Least Privilege**: Managers have only the permissions they need to perform their role
5. **Separation of Concerns**: Admin retains exclusive control over role management

## Future Enhancements

Potential future improvements:
- Add ability for managers to view reports on their subordinates
- Implement territory-based access controls for managers
- Add notification system for manager actions
- Create dashboards specific to manager role

