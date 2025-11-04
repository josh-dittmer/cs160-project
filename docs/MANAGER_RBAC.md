# Manager Role-Based Access Control

## Overview

The Manager RBAC system extends the existing Admin panel to support operational managers with specific permissions. Managers have full access to day-to-day operations (inventory, orders, audit logs) but require admin approval to promote employees to managers.

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
  - ❌ Cannot promote employees → managers (must create referral)
  - ❌ Cannot promote anyone to admin
  - ❌ Cannot modify own role

- **User Blocking**:
  - ✅ Can block **customers** and **employees**
  - ❌ Cannot block **managers** or **admins**
  - ❌ Cannot block themselves
  - ✅ Any manager can unblock users they or other managers blocked

### 🆕 Manager-Specific Features
- **Referral System**:
  - Create referrals to promote employees → managers
  - View own referrals (pending, approved, rejected, cancelled)
  - Cancel own pending referrals
  - Required: 20+ character justification

## Referral Workflow

```
1. Manager sees employee performing well
   ↓
2. Manager clicks "Refer for Manager" button
   ↓
3. Manager writes justification (min 20 chars)
   ↓
4. Referral appears in Admin's review queue
   ↓
5. Admin reviews referral with context
   ↓
6. Admin approves → Employee becomes Manager
   OR
   Admin rejects → Employee stays Employee
```

## Admin Permissions (Extended)

Admins retain all existing permissions plus:
- Review all pending referrals from all managers
- Approve referrals (auto-promotes user to manager)
- Reject referrals with optional notes
- View referral history (all statuses)

## Technical Implementation

### Backend

**New Model**: `PromotionReferral`
```python
- referred_user_id: User being referred
- referring_manager_id: Manager creating referral
- target_role: Always "manager"
- reason: Justification (min 20 chars)
- status: pending | approved | rejected | cancelled
- admin_notes: Optional feedback from admin
- reviewed_at, reviewed_by_admin_id: Tracking
```

**New Endpoints**:
- `POST /api/manager/referrals` - Create referral
- `GET /api/manager/referrals` - List own referrals
- `DELETE /api/manager/referrals/{id}` - Cancel pending
- `PUT /api/manager/users/{id}/role` - Promote customer→employee
- `PUT /api/manager/users/{id}/block` - Block customers/employees
- `GET /api/admin/referrals` - List all (admin)
- `PUT /api/admin/referrals/{id}/approve` - Approve (admin)
- `PUT /api/admin/referrals/{id}/reject` - Reject (admin)

**Updated Endpoints**: All inventory, orders, and audit log endpoints now accept managers (`require_manager` instead of `require_admin`)

### Frontend

**Single Route**: `/admin/*` serves both roles
- Layout checks: `user.role === 'admin' || user.role === 'manager'`
- Dynamic title: "Admin Panel" vs "Manager Panel"
- Navigation: Includes "Referrals" for both roles

**Role-Based UI**:
- `/admin/users`: Conditional rendering based on `currentUser.role`
- `/admin/referrals`: Shows different view for admin vs manager
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
- `referral_created`: New promotion referrals
- `referral_cancelled`: Cancelled referrals
- All inventory/order changes (same as admin)

## Security Considerations

1. **Role Hierarchy**: Enforced at API level
   - Managers cannot escalate privileges
   - Permission checks on every request

2. **Self-Protection**: 
   - Cannot modify own role
   - Cannot block themselves

3. **Referral Integrity**:
   - Managers can only cancel own pending referrals
   - Only admins can approve/reject
   - Auto-audit trail for all referral actions

4. **Permission Checks**: Both frontend and backend validate permissions
   - Frontend: UI elements hidden/disabled
   - Backend: API returns 403 if unauthorized

## Design Rationale

### Why This Approach?

1. **DRY Principle**: Reusing admin pages maximizes code reuse (80%+ of code shared)
2. **Single Source of Truth**: One layout, one set of pages, conditional rendering only where needed
3. **Maintainability**: Changes to inventory/orders/audit automatically apply to managers
4. **Referral System**: Provides oversight while allowing operational autonomy
5. **Clear Hierarchy**: Admin has final authority on strategic decisions (manager promotions)

### Why Not Separate Manager Panel?

Creating `/manager/*` routes would duplicate:
- Dashboard (100% identical)
- Inventory (100% identical)  
- Orders (100% identical)
- Audit logs (100% identical)

Only Users and Referrals pages have role-specific UI, handled via conditional rendering.

## Future Enhancements

Potential additions:
- Bulk referral operations
- Referral templates/categories
- Manager performance metrics
- Delegation: Managers assign employees to tasks
- Regional management: Managers oversee specific locations
- Approval workflows: Multi-level approvals for sensitive operations

## Testing

**Manager Test Scenarios**:
1. Login as manager@sjsu.edu
2. Navigate to Users
3. Promote customer to employee (should work)
4. Try to promote employee to manager (should show referral button)
5. Create referral with justification
6. View referral in Referrals page
7. Try to block employee (should work)
8. Try to block manager (should show "No access")
9. Verify inventory/orders/audit access (full)

**Admin Test Scenarios**:
1. Login as admin@sjsu.edu
2. Navigate to Referrals
3. See pending referrals from managers
4. Approve/reject with optional notes
5. Verify promoted user now has manager role

##Conclusion

The Manager RBAC system successfully extends the admin panel with minimal code duplication while maintaining security and operational efficiency. Managers can handle day-to-day operations while admins retain strategic control over the management hierarchy.

