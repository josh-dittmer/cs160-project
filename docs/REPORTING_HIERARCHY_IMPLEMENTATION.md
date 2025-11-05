# Reporting Hierarchy Implementation Summary

## Overview

A complete reporting hierarchy system has been implemented where:
- **Employees** must report to a manager
- **Managers** report to the admin
- **Admin** reports to no one
- **Customers** have no reporting relationship

## Database Changes

### 1. User Model Updates (`backend/app/models.py`)

Added self-referential foreign key and relationships:
```python
# New field
reports_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)

# New relationships
subordinates: Mapped[list["User"]] = relationship("User", back_populates="manager", foreign_keys=[reports_to])
manager: Mapped["User | None"] = relationship("User", back_populates="subordinates", remote_side=[id], foreign_keys=[reports_to])
```

### 2. EmployeeReferral Model (`backend/app/models.py`)

New table for employee referrals (employees referring customers):
- `id`, `referred_user_id`, `referring_employee_id`, `reviewing_manager_id`
- `reason`, `status` (pending/approved/rejected/cancelled)
- `manager_notes`, `created_at`, `reviewed_at`

## Schema Changes (`backend/app/schemas.py`)

### Updated Schemas
- **UserOut**: Added `reports_to: int | None = None`
- **UserListAdmin**: Added `reports_to: int | None = None`
- **UserRoleUpdate**: Added `manager_id` and `subordinate_reassignments` fields
- **UserBlockUpdate**: Added `subordinate_reassignments` field

### New Schemas
- **EmployeeReferralCreate**: For creating employee referrals
- **EmployeeReferralOut**: For employee referral responses
- **EmployeeReferralReview**: For manager review of employee referrals

## API Changes

### Admin Router (`/api/admin/*`)

#### Modified Endpoints

**`PUT /api/admin/users/{user_id}/role`**
- When promoting to `employee`: requires `manager_id` parameter
  - Validates manager exists and has role "manager"
  - Enforces "first hire must be manager" rule
- When promoting to `manager`: auto-sets `reports_to` to admin's ID
- When demoting from `manager`: 
  - If has subordinates: requires `subordinate_reassignments` mapping
  - Validates all subordinates are reassigned atomically
- When demoting to `customer`: clears `reports_to`

**`PUT /api/admin/users/{user_id}/block`**
- When blocking a manager with subordinates:
  - Requires `subordinate_reassignments` mapping
  - Transfers all subordinates atomically before blocking

#### New Endpoints

**`GET /api/admin/users/{user_id}/subordinates`**
- Returns list of all direct reports (subordinates)
- Useful for UI to show which employees need reassignment

**`PUT /api/admin/users/{user_id}/transfer`**
- Transfer an employee to a different manager
- Query parameter: `new_manager_id`
- Validates: user is employee, target is active manager
- Creates audit log

### Manager Router (`/api/manager/*`)

#### Modified Endpoints

**`PUT /api/manager/users/{user_id}/role`**
- When promoting customer to employee: auto-sets `reports_to` to current manager's ID
- When demoting employee to customer: clears `reports_to`

#### New Endpoints

**`GET /api/manager/employee-referrals`**
- Lists all employee referrals submitted to this manager
- Query parameter: `status_filter` (all/pending/approved/rejected)

**`PUT /api/manager/employee-referrals/{id}/approve`**
- Approve employee referral
- Promotes customer to employee with `reports_to` set to reviewing manager
- Optional `manager_notes` in request body

**`PUT /api/manager/employee-referrals/{id}/reject`**
- Reject employee referral
- Optional `manager_notes` in request body

### Employee Router (`/api/employee/*`) - NEW

**`POST /api/employee/referrals`**
- Create referral for customer → employee promotion
- Automatically routes to employee's manager (`reports_to`)
- Requires `referred_user_id` and `reason` (min 20 chars)

**`GET /api/employee/referrals`**
- List all referrals created by the current employee

**`DELETE /api/employee/referrals/{id}`**
- Cancel a pending referral (only own referrals)

## Auth Changes (`backend/app/auth.py`)

### Updated UserCtx
- Added `reports_to: int | None = None` field
- Updated in `get_current_user()` to include `reports_to`

### New Function
- **`require_employee()`**: Requires employee, manager, or admin role

## Seed Data (`backend/app/seed.py`)

Updated to create proper hierarchy:
- **Admin**: `admin@sjsu.edu` / `admin123` (reports_to = None)
- **Managers**: 
  - `manager1@sjsu.edu` / `manager123` (reports_to = admin)
  - `manager2@sjsu.edu` / `manager123` (reports_to = admin)
- **Employees**:
  - `employee1@sjsu.edu` / `employee123` (reports_to = manager1)
  - `employee2@sjsu.edu` / `employee123` (reports_to = manager1)
  - `employee3@sjsu.edu` / `employee123` (reports_to = manager2)
- **Customers**:
  - `customer1@sjsu.edu` / `customer123` (reports_to = None)
  - `customer2@sjsu.edu` / `customer123` (reports_to = None)

## Validation Rules

### Employee Creation
- Must specify `manager_id`
- Exception: If no managers exist, admin must hire a manager first

### Manager Creation
- Auto-sets `reports_to` to admin's ID

### Manager Demotion
- If has subordinates: requires reassignment mapping in same request
- All subordinates must be mapped to new managers
- Atomic transaction: all succeed or all fail

### Manager Blocking
- If has subordinates: requires reassignment mapping in same request
- Cannot assign to blocked managers
- Atomic transaction

### Employee Referrals
- Employees can only refer customers
- Referral goes to employee's manager
- Only one pending referral per user

### Manager Promotion Referrals
- Managers can only refer employees for manager promotion
- Admin reviews and approves/rejects

## Testing

To test the implementation:

1. **Delete and recreate database**:
   ```bash
   cd backend
   rm sqlite.db
   python -m app.seed
   ```

2. **Start backend server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
   ```

3. **Test scenarios**:
   - Login as admin and promote customer to employee (should require manager_id)
   - Login as admin and promote customer to manager (should auto-set reports_to)
   - Login as manager1 and promote customer to employee (should auto-set to manager1)
   - Login as employee1 and create employee referral
   - Login as manager1 and approve/reject employee referral
   - Try to demote manager1 with employees (should require reassignments)
   - Test atomic transfer with subordinate_reassignments

## Error Handling

The system properly handles:
- Missing manager_id when promoting to employee
- Attempting to promote to employee when no managers exist
- Demoting/blocking manager with subordinates without reassignments
- Invalid manager IDs in reassignments
- Blocked managers in reassignments
- Mismatched subordinate IDs in reassignments

## Audit Logging

All operations are logged with:
- Actor information (ID, email, role)
- Target information
- Old and new values
- Subordinate reassignments (when applicable)
- IP address
- Timestamp

## Notes

- The implementation maintains referential integrity
- All subordinate transfers are atomic (all or nothing)
- The system prevents orphaned employees
- First hire must be a manager (enforced when no managers exist)
- All role changes update `reports_to` appropriately

