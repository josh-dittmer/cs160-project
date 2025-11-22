from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func

from ..database import get_db
from ..models import User, Item, Order, OrderItem, AuditLog, CartItem, Review
from ..audit import create_audit_log, get_actor_ip
from ..schemas import (
    UserListAdmin,
    UserRoleUpdate,
    UserBlockUpdate,
    UserManagerUpdate,
    ItemCreate,
    ItemUpdate,
    ItemActivateUpdate,
    ItemDetailOut,
    OrderListAdmin,
    OrderDetailAdmin,
    OrderStatusUpdate,
    OrderUserInfo,
    OrderItemAdmin,
    AuditLogOut,
    AuditLogStats,
)
from ..auth import require_admin, require_manager, UserCtx, get_all_subordinate_ids

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ============ Helper Functions ============

def smart_title_case(text: str) -> str:
    """
    Convert text to Title Case while preserving apostrophes and handling hyphens.
    
    Examples:
        "ben & jerry's ice cream" → "Ben & Jerry's Ice Cream"
        "coca-cola" → "Coca-Cola"
        "coca-cola's taste" → "Coca-Cola's Taste"
        "mcdonald's" → "Mcdonald's"
    """
    words = text.split()
    result = []
    for word in words:
        # Handle hyphenated words (e.g., "coca-cola" → "Coca-Cola")
        if '-' in word:
            parts = [part.capitalize() for part in word.split('-')]
            result.append('-'.join(parts))
        else:
            # Use capitalize() to avoid breaking apostrophes
            result.append(word.capitalize())
    return ' '.join(result)


def validate_item_name(name: str, allow_special_chars: bool, allow_numbers: bool) -> None:
    """
    Validate item name based on character restrictions.
    
    Logic:
    - Default: letters, space, hyphen, apostrophe, ampersand
    - allow_special_chars: Default + additional special chars (but NOT numbers unless also flagged)
    - allow_numbers: Default + numbers
    - Both: Default + special chars + numbers
    
    Args:
        name: The item name to validate
        allow_special_chars: If True, allow additional special characters
        allow_numbers: If True, allow numbers
    
    Raises:
        HTTPException: If name contains disallowed characters
    """
    import re
    
    validation_hint = " Update the Name Validation Options to allow numbers and/or special characters."
    
    if allow_special_chars and allow_numbers:
        # Allow everything - no restrictions
        return
    elif allow_special_chars:
        # Allow default chars + other special chars (but NOT numbers)
        pattern = r'^[a-zA-Z\s\-\'&!@#$%^*()_+=\[\]{};:\'\"<>,.?/\\|`~]+$'
        error_msg = (
            "Item name cannot contain numbers when 'Allow numbers' is unchecked."
            " Enable the 'Allow numbers' option in Name Validation Options to include digits."
        )
    elif allow_numbers:
        # Allow default chars + numbers
        pattern = r'^[a-zA-Z0-9\s\-\'&]+$'
        error_msg = (
            "Item name can only contain letters, numbers, spaces, hyphens, apostrophes, and ampersands."
            + validation_hint
        )
    else:
        # Default: only letters and default special chars
        pattern = r'^[a-zA-Z\s\-\'&]+$'
        error_msg = (
            "Item name can only contain letters, spaces, hyphens, apostrophes, and ampersands."
            + validation_hint
        )
    
    if not re.match(pattern, name):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )


# ============ User Management Endpoints ============

@router.get("/users", response_model=List[UserListAdmin])
def list_users(
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    List all users with their roles and status.
    Manager or admin only.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


@router.put("/users/{user_id}/role", status_code=status.HTTP_200_OK)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    request: Request,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Change a user's role.
    Admin cannot demote themselves.
    Only one admin is allowed in the system.
    When promoting to employee: requires manager_id.
    When promoting to manager: sets reports_to to None (managers don't report to anyone).
    When demoting from manager: requires subordinate_reassignments if has subordinates.
    Admin only.
    """
    # Prevent admin from demoting themselves
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role",
        )
    
    # Prevent creating additional admins (single admin model)
    if role_update.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create additional administrators. Only one admin is allowed in the system.",
        )
    
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Store old role for audit log
    old_role = user.role
    old_reports_to = user.reports_to
    
    # Check if user is being demoted from manager FIRST (before other role checks)
    if old_role == "manager" and role_update.role in ["employee", "customer"]:
        # Check if manager has subordinates
        subordinate_count = db.query(func.count(User.id)).filter(User.reports_to == user_id).scalar()
        
        print(f"\n=== BACKEND: Demoting Manager {user_id} ===")
        print(f"Subordinate count: {subordinate_count}")
        print(f"New role: {role_update.role}")
        print(f"Subordinate reassignments received: {role_update.subordinate_reassignments}")
        
        if subordinate_count > 0:
            # Require subordinate_reassignments
            if not role_update.subordinate_reassignments:
                subordinates = db.query(User).filter(User.reports_to == user_id).all()
                subordinate_list = [{"id": s.id, "email": s.email, "full_name": s.full_name} for s in subordinates]
                print(f"ERROR: No subordinate reassignments provided! Subordinates: {subordinate_list}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot demote manager with {subordinate_count} subordinate(s). Provide subordinate_reassignments mapping.",
                    headers={"X-Subordinates": str(subordinate_list)},
                )
            
            # Validate all subordinates are included in reassignments
            subordinates = db.query(User).filter(User.reports_to == user_id).all()
            subordinate_ids = {s.id for s in subordinates}
            # Convert keys to int in case they come as strings from JSON
            reassignments_dict = {int(k): v for k, v in role_update.subordinate_reassignments.items()}
            provided_ids = set(reassignments_dict.keys())
            
            print(f"Subordinate IDs in DB: {subordinate_ids}")
            print(f"Provided reassignment IDs: {provided_ids}")
            print(f"Reassignments dict: {reassignments_dict}")
            
            if subordinate_ids != provided_ids:
                missing = subordinate_ids - provided_ids
                extra = provided_ids - subordinate_ids
                error_parts = []
                if missing:
                    error_parts.append(f"Missing subordinate IDs: {missing}")
                if extra:
                    error_parts.append(f"Extra IDs (not subordinates): {extra}")
                print(f"ERROR: Mismatch! {' '.join(error_parts)}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subordinate reassignments mismatch. {' '.join(error_parts)}",
                )
            
            # Validate all new managers exist and are managers
            for subordinate_id, new_manager_id in reassignments_dict.items():
                new_manager = db.get(User, new_manager_id)
                if not new_manager:
                    print(f"ERROR: New manager {new_manager_id} not found")
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"New manager with id {new_manager_id} not found",
                    )
                if new_manager.role != "manager":
                    print(f"ERROR: User {new_manager_id} is not a manager (role: {new_manager.role})")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"User {new_manager_id} ({new_manager.email}) is not a manager",
                    )
            
            # Perform atomic transfer of all subordinates
            print("Starting subordinate reassignments:")
            for subordinate in subordinates:
                old_reports_to = subordinate.reports_to
                new_reports_to = reassignments_dict[subordinate.id]
                subordinate.reports_to = new_reports_to
                print(f"  - Subordinate {subordinate.id} ({subordinate.email}): {old_reports_to} -> {new_reports_to}")
        
        # Set reports_to for demoted user
        if role_update.role == "customer":
            user.reports_to = None
        elif role_update.role == "employee":
            # If demoting to employee, require manager_id
            if not role_update.manager_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="manager_id is required when demoting manager to employee",
                )
            # Validate manager
            manager = db.get(User, role_update.manager_id)
            if not manager or manager.role != "manager":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid manager_id",
                )
            user.reports_to = role_update.manager_id
    
    # Check if user is being promoted to employee (but not demoted from manager - that's handled above)
    elif role_update.role == "employee":
        # Require manager_id when promoting to employee
        if not role_update.manager_id:
            # Check if there are any managers in the system
            manager_count = db.query(func.count(User.id)).filter(User.role == "manager").scalar()
            if manager_count == 0:
                # First hire scenario - must be a manager
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="FIRST_HIRE_MUST_BE_MANAGER: No managers exist in the system. The first hire must be promoted to 'manager' role before any employees can be hired. Please change this user's role to 'manager' instead.",
                )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="manager_id is required when promoting to employee",
            )
        
        # Validate manager exists and is actually a manager
        manager = db.get(User, role_update.manager_id)
        if not manager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Manager with id {role_update.manager_id} not found",
            )
        if manager.role != "manager":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {role_update.manager_id} is not a manager",
            )
        
        user.reports_to = role_update.manager_id
    
    # Check if user is being promoted to manager
    elif role_update.role == "manager":
        # Managers don't report to anyone (like admins and customers)
        user.reports_to = None
    
    # Check if user is being set to customer (from any non-manager role)
    elif role_update.role == "customer":
        user.reports_to = None
    
    # Update role
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="user_role_updated",
        target_type="user",
        target_id=user.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "old_role": old_role,
            "new_role": role_update.role,
            "old_reports_to": old_reports_to,
            "new_reports_to": user.reports_to,
            "user_email": user.email,
            "subordinate_reassignments": role_update.subordinate_reassignments if role_update.subordinate_reassignments else None,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": f"User role updated to {role_update.role}",
        "user": UserListAdmin.model_validate(user),
    }


@router.put("/users/{user_id}/block", status_code=status.HTTP_200_OK)
def block_user(
    user_id: int,
    block_update: UserBlockUpdate,
    request: Request,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Block or unblock a user (set is_active).
    Admin cannot block themselves.
    When blocking a manager: requires subordinate_reassignments if has subordinates.
    Admin only.
    """
    # Prevent admin from blocking themselves
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot block yourself",
        )
    
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Store old status for audit log
    old_status = user.is_active
    
    # If blocking a manager, check for subordinates
    if not block_update.is_active and user.role == "manager":
        subordinate_count = db.query(func.count(User.id)).filter(User.reports_to == user_id).scalar()
        
        if subordinate_count > 0:
            # Require subordinate_reassignments
            if not block_update.subordinate_reassignments:
                subordinates = db.query(User).filter(User.reports_to == user_id).all()
                subordinate_list = [{"id": s.id, "email": s.email, "full_name": s.full_name} for s in subordinates]
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot block manager with {subordinate_count} subordinate(s). Provide subordinate_reassignments mapping.",
                    headers={"X-Subordinates": str(subordinate_list)},
                )
            
            # Validate all subordinates are included in reassignments
            subordinates = db.query(User).filter(User.reports_to == user_id).all()
            subordinate_ids = {s.id for s in subordinates}
            provided_ids = set(block_update.subordinate_reassignments.keys())
            
            if subordinate_ids != provided_ids:
                missing = subordinate_ids - provided_ids
                extra = provided_ids - subordinate_ids
                error_parts = []
                if missing:
                    error_parts.append(f"Missing subordinate IDs: {missing}")
                if extra:
                    error_parts.append(f"Extra IDs (not subordinates): {extra}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subordinate reassignments mismatch. {' '.join(error_parts)}",
                )
            
            # Validate all new managers exist and are managers
            for subordinate_id, new_manager_id in block_update.subordinate_reassignments.items():
                new_manager = db.get(User, new_manager_id)
                if not new_manager:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"New manager with id {new_manager_id} not found",
                    )
                if new_manager.role != "manager":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"User {new_manager_id} ({new_manager.email}) is not a manager",
                    )
                if not new_manager.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"New manager {new_manager_id} ({new_manager.email}) is blocked",
                    )
            
            # Perform atomic transfer of all subordinates
            for subordinate in subordinates:
                subordinate.reports_to = block_update.subordinate_reassignments[subordinate.id]
    
    user.is_active = block_update.is_active
    db.commit()
    db.refresh(user)
    
    # Create audit log
    action_type = "user_unblocked" if block_update.is_active else "user_blocked"
    create_audit_log(
        db=db,
        action_type=action_type,
        target_type="user",
        target_id=user.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "old_status": old_status,
            "new_status": block_update.is_active,
            "user_email": user.email,
            "subordinate_reassignments": block_update.subordinate_reassignments if block_update.subordinate_reassignments else None,
        },
        ip_address=get_actor_ip(request),
    )
    
    action = "unblocked" if block_update.is_active else "blocked"
    return {
        "ok": True,
        "message": f"User {action} successfully",
        "user": UserListAdmin.model_validate(user),
    }


@router.put("/users/{user_id}/manager", status_code=status.HTTP_200_OK)
def update_employee_manager(
    user_id: int,
    manager_update: UserManagerUpdate,
    request: Request,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Update an employee's manager.
    Admin only.
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Only employees can have their manager changed
    if user.role != "employee":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change manager for {user.role}. Only employees report to managers.",
        )
    
    # Validate new manager exists and is actually a manager
    new_manager = db.get(User, manager_update.manager_id)
    if not new_manager:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Manager with id {manager_update.manager_id} not found",
        )
    
    if new_manager.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User {manager_update.manager_id} ({new_manager.email}) is not a manager",
        )
    
    if not new_manager.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Manager {new_manager.email} is blocked and cannot accept subordinates",
        )
    
    # Store old manager for audit log
    old_manager_id = user.reports_to
    old_manager_email = None
    if old_manager_id:
        old_manager = db.get(User, old_manager_id)
        if old_manager:
            old_manager_email = old_manager.email
    
    # Update the employee's manager
    user.reports_to = manager_update.manager_id
    db.commit()
    db.refresh(user)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="user_manager_changed",
        target_type="user",
        target_id=user.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "user_email": user.email,
            "user_name": user.full_name,
            "old_manager_id": old_manager_id,
            "old_manager_email": old_manager_email,
            "new_manager_id": manager_update.manager_id,
            "new_manager_email": new_manager.email,
            "new_manager_name": new_manager.full_name,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": f"Employee {user.email} now reports to {new_manager.email}",
        "user": UserListAdmin.model_validate(user),
    }


@router.get("/users/{user_id}/subordinates", response_model=List[UserListAdmin])
def get_user_subordinates(
    user_id: int,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get all users reporting to a specific user (direct subordinates).
    Admin only.
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    subordinates = db.query(User).filter(User.reports_to == user_id).order_by(User.full_name).all()
    return subordinates


@router.put("/users/{user_id}/transfer", status_code=status.HTTP_200_OK)
def transfer_employee(
    user_id: int,
    new_manager_id: int = Query(..., description="ID of the new manager"),
    request: Request = None,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Transfer an employee to a different manager.
    Admin only.
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Can only transfer employees
    if user.role != "employee":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Can only transfer employees. User is a {user.role}",
        )
    
    # Validate new manager
    new_manager = db.get(User, new_manager_id)
    if not new_manager:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Manager with id {new_manager_id} not found",
        )
    
    if new_manager.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target user {new_manager_id} is not a manager",
        )
    
    if not new_manager.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target manager {new_manager_id} is blocked",
        )
    
    # Store old manager for audit log
    old_manager_id = user.reports_to
    
    # Transfer
    user.reports_to = new_manager_id
    db.commit()
    db.refresh(user)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="employee_transferred",
        target_type="user",
        target_id=user.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "user_email": user.email,
            "old_manager_id": old_manager_id,
            "new_manager_id": new_manager_id,
            "new_manager_email": new_manager.email,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": f"Employee transferred to manager {new_manager.email}",
        "user": UserListAdmin.model_validate(user),
    }


# ============ Inventory Management Endpoints ============

@router.get("/items", response_model=List[ItemDetailOut])
def list_items_admin(
    query: Optional[str] = Query(None, description="Search by name or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: str = Query("active", description="Filter by status: active, inactive, or all"),
    low_stock_threshold: Optional[int] = Query(None, ge=0, description="Filter items with stock below this threshold"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    List all items with filtering and pagination.
    Defaults to showing only active items.
    Manager or admin only.
    """
    # Build query
    stmt = select(Item)
    
    # Filter by status
    if status == "active":
        stmt = stmt.where(Item.is_active == True)
    elif status == "inactive":
        stmt = stmt.where(Item.is_active == False)
    # if status == "all", no filter needed
    
    # Filter by category
    if category:
        stmt = stmt.where(Item.category == category)
    
    # Filter by low stock
    if low_stock_threshold is not None:
        stmt = stmt.where(Item.stock_qty <= low_stock_threshold)
    
    # Search by name or description
    if query:
        search_pattern = f"%{query}%"
        stmt = stmt.where(
            or_(
                Item.name.ilike(search_pattern),
                Item.description.ilike(search_pattern),
            )
        )
    
    # Order by name and apply pagination
    stmt = stmt.order_by(Item.name).limit(limit).offset(offset)
    
    items = db.execute(stmt).scalars().all()
    return items


@router.get("/categories", response_model=List[str])
def get_categories(
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Get all unique categories from items.
    Returns a sorted list of category names.
    Manager or admin only.
    """
    stmt = select(Item.category).where(
        Item.category.isnot(None),
        Item.category != ""
    ).distinct().order_by(Item.category)
    
    categories = db.execute(stmt).scalars().all()
    return list(categories)


@router.get("/items/{item_id}", response_model=ItemDetailOut)
def get_item_admin(
    item_id: int,
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Get single item details (including inactive items).
    Manager or admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    return item


@router.post("/items", response_model=ItemDetailOut, status_code=status.HTTP_201_CREATED)
def create_item(
    item_data: ItemCreate,
    request: Request,
    auto_case: bool = Query(True, description="Automatically convert item name to Title Case"),
    allow_special_chars: bool = Query(False, description="Allow all special characters in item name"),
    allow_numbers: bool = Query(False, description="Allow numbers in item name"),
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Create a new item.
    Manager or admin only.
    """
    # Validate character restrictions
    validate_item_name(item_data.name, allow_special_chars, allow_numbers)
    
    # Apply Title Case if auto_case is enabled
    item_name = smart_title_case(item_data.name) if auto_case else item_data.name
    
    # Check for duplicate names (case-insensitive)
    existing_item = db.execute(
        select(Item).where(func.lower(Item.name) == item_name.lower())
    ).scalar_one_or_none()
    
    if existing_item:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item with this name already exists: '{existing_item.name}'",
        )
    
    # Create new item with processed name
    item_dict = item_data.model_dump()
    item_dict['name'] = item_name
    new_item = Item(**item_dict)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="item_created",
        target_type="item",
        target_id=new_item.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "item_name": new_item.name,
            "price_cents": new_item.price_cents,
            "category": new_item.category,
            "stock_qty": new_item.stock_qty,
            "auto_case": auto_case,
        },
        ip_address=get_actor_ip(request),
    )
    
    return new_item


@router.put("/items/{item_id}", response_model=ItemDetailOut)
def update_item(
    item_id: int,
    item_data: ItemUpdate,
    request: Request,
    auto_case: bool = Query(True, description="Automatically convert item name to Title Case"),
    allow_special_chars: bool = Query(False, description="Allow all special characters in item name"),
    allow_numbers: bool = Query(False, description="Allow numbers in item name"),
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Update an item (all fields optional).
    Manager or admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    # Store old values for audit log
    old_values = {
        "name": item.name,
        "price_cents": item.price_cents,
        "weight_oz": item.weight_oz,
        "category": item.category,
        "image_url": item.image_url,
        "video_url": item.video_url,
        "description": item.description,
        "nutrition_json": item.nutrition_json,
        "stock_qty": item.stock_qty,
        "is_active": item.is_active,
    }
    
    # Update only provided fields
    update_data = item_data.model_dump(exclude_unset=True)
    
    # If name is being updated, validate and apply Title Case and check for duplicates
    if 'name' in update_data:
        # Validate character restrictions
        validate_item_name(update_data['name'], allow_special_chars, allow_numbers)
        
        new_name = smart_title_case(update_data['name']) if auto_case else update_data['name']
        
        # Check for duplicate names (case-insensitive), excluding current item
        existing_item = db.execute(
            select(Item).where(
                func.lower(Item.name) == new_name.lower(),
                Item.id != item_id
            )
        ).scalar_one_or_none()
        
        if existing_item:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item with this name already exists: '{existing_item.name}'",
            )
        
        update_data['name'] = new_name
    
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    
    # Create audit log with changed fields
    changed_fields = {}
    for field, new_value in update_data.items():
        if field in old_values and old_values[field] != new_value:
            changed_fields[field] = {"old": old_values[field], "new": new_value}
    
    create_audit_log(
        db=db,
        action_type="item_updated",
        target_type="item",
        target_id=item.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "item_name": item.name,
            "changed_fields": changed_fields,
            "auto_case": auto_case if 'name' in item_data.model_dump(exclude_unset=True) else None,
        },
        ip_address=get_actor_ip(request),
    )
    
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_200_OK)
def delete_item(
    item_id: int,
    request: Request,
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Soft delete an item (set is_active to False).
    Manager or admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    item.is_active = False
    db.commit()
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="item_deactivated",
        target_type="item",
        target_id=item.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "item_name": item.name,
            "category": item.category,
            "price_cents": item.price_cents,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": "Item deactivated successfully",
    }


@router.put("/items/{item_id}/activate", response_model=ItemDetailOut)
def activate_item(
    item_id: int,
    activate_data: ItemActivateUpdate,
    request: Request,
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Activate or deactivate an item.
    Manager or admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    # Store old status for audit log
    old_status = item.is_active
    
    item.is_active = activate_data.is_active
    db.commit()
    db.refresh(item)
    
    # Create audit log
    action_type = "item_activated" if activate_data.is_active else "item_deactivated"
    create_audit_log(
        db=db,
        action_type=action_type,
        target_type="item",
        target_id=item.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "item_name": item.name,
            "old_status": old_status,
            "new_status": activate_data.is_active,
        },
        ip_address=get_actor_ip(request),
    )
    
    return item


@router.delete("/items/{item_id}/permanent", status_code=status.HTTP_200_OK)
def permanently_delete_item(
    item_id: int,
    request: Request,
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Permanently delete an item from the database with cascade delete.
    This will also delete:
    - All reviews for this item
    - All cart items containing this item
    - All order items containing this item (order history will show the item as deleted)
    
    This action cannot be undone.
    Manager or admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    # Count related records for audit log
    review_count = db.query(func.count(Review.id)).filter(Review.item_id == item_id).scalar() or 0
    cart_count = db.query(func.count(CartItem.id)).filter(CartItem.item_id == item_id).scalar() or 0
    order_item_count = db.query(func.count(OrderItem.id)).filter(OrderItem.item_id == item_id).scalar() or 0
    
    # Store item details before deletion (important for permanent deletes!)
    item_details = {
        "item_name": item.name,
        "category": item.category,
        "price_cents": item.price_cents,
        "weight_oz": item.weight_oz,
        "stock_qty": item.stock_qty,
        "description": item.description,
        "cascade_deleted": {
            "reviews": review_count,
            "cart_items": cart_count,
            "order_items": order_item_count,
        }
    }
    
    # Create audit log BEFORE deleting
    create_audit_log(
        db=db,
        action_type="item_permanently_deleted",
        target_type="item",
        target_id=item.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details=item_details,
        ip_address=get_actor_ip(request),
    )
    
    # Cascade delete related records (in order to respect foreign keys)
    # 1. Delete reviews (no dependencies)
    if review_count > 0:
        db.query(Review).filter(Review.item_id == item_id).delete()
    
    # 2. Delete cart items (no dependencies)
    if cart_count > 0:
        db.query(CartItem).filter(CartItem.item_id == item_id).delete()
    
    # 3. Delete order items (references orders and items)
    if order_item_count > 0:
        db.query(OrderItem).filter(OrderItem.item_id == item_id).delete()
    
    # 4. Finally delete the item itself
    db.delete(item)
    db.commit()
    
    message_parts = [f"Item '{item.name}' permanently deleted"]
    if review_count > 0 or cart_count > 0 or order_item_count > 0:
        cascade_info = []
        if review_count > 0:
            cascade_info.append(f"{review_count} review(s)")
        if cart_count > 0:
            cascade_info.append(f"{cart_count} cart item(s)")
        if order_item_count > 0:
            cascade_info.append(f"{order_item_count} order item(s)")
        message_parts.append(f"Also deleted: {', '.join(cascade_info)}")
    
    return {
        "ok": True,
        "message": ". ".join(message_parts),
        "cascade_deleted": {
            "reviews": review_count,
            "cart_items": cart_count,
            "order_items": order_item_count,
        }
    }


# ============ Order Management Endpoints ============

@router.get("/orders", response_model=List[OrderListAdmin])
def list_orders(
    query: Optional[str] = Query(None, description="Search by order ID, user email, or payment intent ID"),
    status_filter: str = Query("all", description="Filter by status: all, delivered, pending"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    from_date: Optional[str] = Query(None, description="Filter orders from date (ISO format)"),
    to_date: Optional[str] = Query(None, description="Filter orders to date (ISO format)"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    List all orders with filtering, search, and pagination.
    Manager or admin only.
    """
    # Build base query with join to User and count of items
    stmt = (
        select(
            Order.id,
            Order.user_id,
            User.email.label("user_email"),
            User.full_name.label("user_full_name"),
            Order.created_at,
            Order.delivered_at,
            Order.payment_intent_id,
            func.count(OrderItem.id).label("total_items"),
            func.sum(Item.price_cents * OrderItem.quantity).label("total_cents"),
        )
        .join(User, Order.user_id == User.id)
        .join(OrderItem, Order.id == OrderItem.order_id)
        .join(Item, OrderItem.item_id == Item.id)
        .group_by(Order.id, Order.user_id, User.email, User.full_name, Order.created_at, Order.delivered_at, Order.payment_intent_id)
    )
    
    # Filter by delivery status
    if status_filter == "delivered":
        stmt = stmt.where(Order.delivered_at.isnot(None))
    elif status_filter == "pending":
        stmt = stmt.where(Order.delivered_at.is_(None))
    
    # Filter by user ID
    if user_id:
        stmt = stmt.where(Order.user_id == user_id)
    
    # Filter by date range
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            stmt = stmt.where(Order.created_at >= from_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid from_date format. Use ISO format (e.g., 2025-01-01T00:00:00Z)",
            )
    
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            stmt = stmt.where(Order.created_at <= to_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid to_date format. Use ISO format (e.g., 2025-12-31T23:59:59Z)",
            )
    
    # Search by query string
    if query:
        search_pattern = f"%{query}%"
        try:
            # Try to parse as order ID
            order_id = int(query)
            stmt = stmt.where(Order.id == order_id)
        except ValueError:
            # Search by email or payment intent ID
            stmt = stmt.where(
                or_(
                    User.email.ilike(search_pattern),
                    Order.payment_intent_id.ilike(search_pattern),
                )
            )
    
    # Order by created_at descending (newest first) and apply pagination
    stmt = stmt.order_by(Order.created_at.desc()).limit(limit).offset(offset)
    
    results = db.execute(stmt).all()
    
    # Convert results to OrderListAdmin objects
    orders = []
    for row in results:
        orders.append(OrderListAdmin(
            id=row.id,
            user_id=row.user_id,
            user_email=row.user_email,
            user_full_name=row.user_full_name,
            total_cents=int(row.total_cents or 0),
            total_items=int(row.total_items or 0),
            created_at=row.created_at,
            delivered_at=row.delivered_at,
            payment_intent_id=row.payment_intent_id,
            is_delivered=row.delivered_at is not None,
        ))
    
    return orders


@router.get("/orders/{order_id}", response_model=OrderDetailAdmin)
def get_order_detail(
    order_id: int,
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific order including all items.
    Manager or admin only.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Get user info
    user = db.get(User, order.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found for this order",
        )
    
    # Get order items with item details
    order_items_query = (
        select(OrderItem, Item)
        .join(Item, OrderItem.item_id == Item.id)
        .where(OrderItem.order_id == order_id)
    )
    order_items_results = db.execute(order_items_query).all()
    
    # Calculate totals and format items
    items = []
    total_cents = 0
    total_weight_oz = 0
    
    for order_item, item in order_items_results:
        items.append(OrderItemAdmin(
            id=order_item.id,
            quantity=order_item.quantity,
            item_id=item.id,
            item_name=item.name,
            item_price_cents=item.price_cents,
            item_image_url=item.image_url,
        ))
        total_cents += item.price_cents * order_item.quantity
        total_weight_oz += item.weight_oz * order_item.quantity
    
    return OrderDetailAdmin(
        id=order.id,
        user=OrderUserInfo(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
        ),
        items=items,
        total_cents=total_cents,
        total_weight_oz=total_weight_oz,
        created_at=order.created_at,
        delivered_at=order.delivered_at,
        payment_intent_id=order.payment_intent_id,
        is_delivered=order.delivered_at is not None,
    )


@router.put("/orders/{order_id}/status", status_code=status.HTTP_200_OK)
def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    request: Request,
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Update order delivery status.
    Sets delivered_at to current time if marking as delivered, or None if marking as pending.
    Manager or admin only.
    """
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )
    
    # Store old status for audit log
    old_delivered_at = order.delivered_at
    
    if status_update.delivered:
        # Mark as delivered with current timestamp
        order.delivered_at = datetime.now(timezone.utc)
        message = "Order marked as delivered"
    else:
        # Mark as pending (not delivered)
        order.delivered_at = None
        message = "Order marked as pending"
    
    db.commit()
    db.refresh(order)
    
    # Get user info for audit log
    user = db.get(User, order.user_id)
    user_email = user.email if user else "Unknown"
    
    # Create audit log
    action_type = "order_marked_delivered" if status_update.delivered else "order_marked_pending"
    create_audit_log(
        db=db,
        action_type=action_type,
        target_type="order",
        target_id=order.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "order_id": order.id,
            "user_email": user_email,
            "old_delivered_at": str(old_delivered_at) if old_delivered_at else None,
            "new_delivered_at": str(order.delivered_at) if order.delivered_at else None,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": message,
        "order_id": order.id,
        "delivered_at": order.delivered_at,
    }


# ============ Audit Log Endpoints ============

@router.get("/audit-logs", response_model=List[AuditLogOut])
def list_audit_logs(
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    actor_email: Optional[str] = Query(None, description="Filter by actor email"),
    target_type: Optional[str] = Query(None, description="Filter by target type (user, item, order, cart)"),
    from_date: Optional[str] = Query(None, description="Filter logs from date (ISO format)"),
    to_date: Optional[str] = Query(None, description="Filter logs to date (ISO format)"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    List all audit logs with filtering and pagination.
    Manager or admin only.
    """
    # Build query
    stmt = select(AuditLog)
    
    # Filter by action type (partial match, case-insensitive)
    if action_type:
        stmt = stmt.where(AuditLog.action_type.ilike(f"%{action_type}%"))
    
    # Filter by actor email (partial match)
    if actor_email:
        stmt = stmt.where(AuditLog.actor_email.ilike(f"%{actor_email}%"))
    
    # Filter by target type
    if target_type:
        stmt = stmt.where(AuditLog.target_type == target_type)
    
    # Filter by date range
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            stmt = stmt.where(AuditLog.timestamp >= from_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid from_date format. Use ISO format (e.g., 2025-01-01T00:00:00Z)",
            )
    
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            stmt = stmt.where(AuditLog.timestamp <= to_dt)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid to_date format. Use ISO format (e.g., 2025-12-31T23:59:59Z)",
            )
    
    # Apply role-based filtering for managers
    if admin.role == "manager":
        # Managers can only see logs from:
        # 1. Themselves
        # 2. Their subordinates (direct and indirect)
        # 3. All customers
        # Exclude system actions (actor_id = NULL)
        
        # Get all subordinate IDs
        subordinate_ids = get_all_subordinate_ids(admin.id, db)
        
        # Get all customer IDs
        customer_ids = {u.id for u in db.query(User.id).filter(User.role == "customer").all()}
        
        # Build allowed actor IDs set
        allowed_ids = {admin.id} | subordinate_ids | customer_ids
        
        # Apply filters: exclude NULL actor_ids and only show allowed actors
        stmt = stmt.where(
            AuditLog.actor_id.isnot(None),
            AuditLog.actor_id.in_(allowed_ids)
        )
    # Admin sees all logs (no additional filtering)
    
    # Order by timestamp descending (newest first) and apply pagination
    stmt = stmt.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
    
    logs = db.execute(stmt).scalars().all()
    return logs


@router.get("/audit-logs/stats", response_model=AuditLogStats)
def get_audit_stats(
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Get audit log statistics.
    Manager or admin only.
    """
    # Determine allowed actor IDs based on role
    allowed_ids = None
    if admin.role == "manager":
        # Managers can only see logs from themselves, their subordinates, and customers
        subordinate_ids = get_all_subordinate_ids(admin.id, db)
        customer_ids = {u.id for u in db.query(User.id).filter(User.role == "customer").all()}
        allowed_ids = {admin.id} | subordinate_ids | customer_ids
    
    # Build base query with role-based filtering
    def apply_manager_filter(query):
        """Helper to apply manager filtering to any query"""
        if allowed_ids is not None:
            # Manager: filter by allowed actor IDs and exclude NULL
            return query.filter(
                AuditLog.actor_id.isnot(None),
                AuditLog.actor_id.in_(allowed_ids)
            )
        # Admin: no filtering
        return query
    
    # Total logs count
    total_logs_query = db.query(func.count(AuditLog.id))
    total_logs_query = apply_manager_filter(total_logs_query)
    total_logs = total_logs_query.scalar() or 0
    
    # Logs in last 24 hours
    last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    logs_last_24h_query = db.query(func.count(AuditLog.id)).filter(
        AuditLog.timestamp >= last_24h
    )
    logs_last_24h_query = apply_manager_filter(logs_last_24h_query)
    logs_last_24h = logs_last_24h_query.scalar() or 0
    
    # Logs in last 7 days
    last_7d = datetime.now(timezone.utc) - timedelta(days=7)
    logs_last_7d_query = db.query(func.count(AuditLog.id)).filter(
        AuditLog.timestamp >= last_7d
    )
    logs_last_7d_query = apply_manager_filter(logs_last_7d_query)
    logs_last_7d = logs_last_7d_query.scalar() or 0
    
    # Top 10 action types
    top_actions_query = db.query(
        AuditLog.action_type,
        func.count(AuditLog.id).label('count')
    )
    top_actions_query = apply_manager_filter(top_actions_query)
    top_actions_result = (
        top_actions_query
        .group_by(AuditLog.action_type)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    top_actions = [
        {"action_type": row[0], "count": row[1]}
        for row in top_actions_result
    ]
    
    # Top 10 actors
    top_actors_query = db.query(
        AuditLog.actor_email,
        func.count(AuditLog.id).label('count')
    ).filter(AuditLog.actor_email.isnot(None))
    top_actors_query = apply_manager_filter(top_actors_query)
    top_actors_result = (
        top_actors_query
        .group_by(AuditLog.actor_email)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    top_actors = [
        {"actor_email": row[0], "count": row[1]}
        for row in top_actors_result
    ]
    
    return AuditLogStats(
        total_logs=total_logs,
        logs_last_24h=logs_last_24h,
        logs_last_7d=logs_last_7d,
        top_actions=top_actions,
        top_actors=top_actors,
    )

