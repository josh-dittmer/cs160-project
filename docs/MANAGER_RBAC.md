# Manager Role-Based Access Control

> **⚠️ NOTE**: The referral system described in this document has been removed from the codebase. Managers can no longer promote employees to managers. Only admins can promote users to manager roles.

## Overview

The Manager RBAC system extends the existing Admin panel to support operational managers with specific permissions. Managers have full access to day-to-day operations (inventory, orders, audit logs).

## Key Features

### Maximum Code Reuse
- **100% reuse**: Inventory, Orders, Dashboard, Audit Logs pages
- **Shared layout**: Single `/admin` route serves both admins and managers
- **Conditional UI**: Role-based rendering only where permissions differ

## Manager Permissions

### ✅ Full Access (Same as Admin)
- **Inventory Management**: Create, update, delete items; manage stock
- **Order Management**: View all orders, update delivery status
- **Audit Logs**: View all system activity logs
- **Dashboard**: View system statistics and metrics

### 🔐 Limited Access (Restricted)
- **User Promotions**:
  - ✅ Can promote **customers** → **employees**
  - ❌ Cannot promote employees → managers
  - ❌ Cannot promote anyone to admin
  - ❌ Cannot modify own role

- **User Blocking**:
  - ✅ Can block **customers** and **employees**
  - ❌ Cannot block **managers** or **admins**
  - ❌ Cannot block themselves
  - ✅ Any manager can unblock users they or other managers blocked

### 🆕 Manager-Specific Features
- None at this time (referral system has been removed)

## Technical Implementation

### Backend

**Manager Endpoints**:
- `PUT /api/manager/users/{id}/role` - Promote customer→employee
- `PUT /api/manager/users/{id}/block` - Block customers/employees

**Updated Endpoints**: All inventory, orders, and audit log endpoints now accept managers (`require_manager` instead of `require_admin`)

### Frontend

**Single Route**: `/admin/*` serves both roles
- Layout checks: `user.role === 'admin' || user.role === 'manager'`
- Dynamic title: "Admin Panel" vs "Manager Panel"

**Role-Based UI**:
- `/admin/users`: Conditional rendering based on `currentUser.role`
- All other pages: No changes needed (100% reused)

## Default Credentials

**Manager Test Account**:
```
Email: manager@sjsu.edu
Password: manager123
```

**Employee Test Account**:
```
Email: employee@sjsu.edu
Password: employee123
```

**Admin Account**:
```
Email: admin@sjsu.edu
Password: admin123
```

## Audit Logging

All manager actions are logged with `role: "manager"` context:
- `user_role_updated`: Customer→Employee promotions
- `user_blocked`/`user_unblocked`: User blocking actions
- All inventory/order changes (same as admin)

## Security Considerations

1. **Role Hierarchy**: Enforced at API level
   - Managers cannot escalate privileges
   - Permission checks on every request

2. **Self-Protection**: 
   - Cannot modify own role
   - Cannot block themselves


4. **Permission Checks**: Both frontend and backend validate permissions
   - Frontend: UI elements hidden/disabled
   - Backend: API returns 403 if unauthorized

## Design Rationale

### Why This Approach?

1. **DRY Principle**: Reusing admin pages maximizes code reuse (80%+ of code shared)
2. **Single Source of Truth**: One layout, one set of pages, conditional rendering only where needed
3. **Maintainability**: Changes to inventory/orders/audit automatically apply to managers
4. **Clear Hierarchy**: Admin has final authority on strategic decisions (manager promotions)

### Why Not Separate Manager Panel?

Creating `/manager/*` routes would duplicate:
- Dashboard (100% identical)
- Inventory (100% identical)  
- Orders (100% identical)
- Audit logs (100% identical)

Only the Users page has role-specific UI, handled via conditional rendering.

## Future Enhancements

Potential additions:
- Manager performance metrics
- Delegation: Managers assign employees to tasks
- Regional management: Managers oversee specific locations
- Approval workflows: Multi-level approvals for sensitive operations

## Testing

**Manager Test Scenarios**:
1. Login as manager@sjsu.edu
2. Navigate to Users
3. Promote customer to employee (should work)
4. Try to promote employee to manager (should be blocked - admin only)
5. Try to block employee (should work)
6. Try to block manager (should show "No access")
7. Verify inventory/orders/audit access (full)

**Admin Test Scenarios**:
1. Login as admin@sjsu.edu
2. Navigate to Users
3. Promote employee to manager (should work)
4. Verify all role changes work
5. Verify full access to all features

##Conclusion

The Manager RBAC system successfully extends the admin panel with minimal code duplication while maintaining security and operational efficiency. Managers can handle day-to-day operations while admins retain strategic control over the management hierarchy.

