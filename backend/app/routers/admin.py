from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from ..database import get_db
from ..models import User, Item
from ..schemas import (
    UserListAdmin,
    UserRoleUpdate,
    UserBlockUpdate,
    ItemCreate,
    ItemUpdate,
    ItemActivateUpdate,
    ItemDetailOut,
)
from ..auth import require_admin, UserCtx

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ============ User Management Endpoints ============

@router.get("/users", response_model=List[UserListAdmin])
def list_users(
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    List all users with their roles and status.
    Admin only.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


@router.put("/users/{user_id}/role", status_code=status.HTTP_200_OK)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Change a user's role.
    Admin cannot demote themselves.
    Only one admin is allowed in the system.
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
    
    user.role = role_update.role
    db.commit()
    db.refresh(user)
    
    return {
        "ok": True,
        "message": f"User role updated to {role_update.role}",
        "user": UserListAdmin.model_validate(user),
    }


@router.put("/users/{user_id}/block", status_code=status.HTTP_200_OK)
def block_user(
    user_id: int,
    block_update: UserBlockUpdate,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Block or unblock a user (set is_active).
    Admin cannot block themselves.
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
    
    user.is_active = block_update.is_active
    db.commit()
    db.refresh(user)
    
    action = "unblocked" if block_update.is_active else "blocked"
    return {
        "ok": True,
        "message": f"User {action} successfully",
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
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    List all items with filtering and pagination.
    Defaults to showing only active items.
    Admin only.
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


@router.get("/items/{item_id}", response_model=ItemDetailOut)
def get_item_admin(
    item_id: int,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Get single item details (including inactive items).
    Admin only.
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
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Create a new item.
    Admin only.
    """
    new_item = Item(**item_data.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return new_item


@router.put("/items/{item_id}", response_model=ItemDetailOut)
def update_item(
    item_id: int,
    item_data: ItemUpdate,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Update an item (all fields optional).
    Admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    # Update only provided fields
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    db.commit()
    db.refresh(item)
    
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_200_OK)
def delete_item(
    item_id: int,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Soft delete an item (set is_active to False).
    Admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    item.is_active = False
    db.commit()
    
    return {
        "ok": True,
        "message": "Item deactivated successfully",
    }


@router.put("/items/{item_id}/activate", response_model=ItemDetailOut)
def activate_item(
    item_id: int,
    activate_data: ItemActivateUpdate,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Activate or deactivate an item.
    Admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    item.is_active = activate_data.is_active
    db.commit()
    db.refresh(item)
    
    return item


@router.delete("/items/{item_id}/permanent", status_code=status.HTTP_200_OK)
def permanently_delete_item(
    item_id: int,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Permanently delete an item from the database.
    This action cannot be undone.
    Admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    db.delete(item)
    db.commit()
    
    return {
        "ok": True,
        "message": "Item permanently deleted from database",
    }

