from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func

from ..database import get_db
from ..models import User, Item, Order, OrderItem, AuditLog, PromotionReferral
from ..audit import create_audit_log, get_actor_ip
from ..schemas import (
    UserListAdmin,
    UserRoleUpdate,
    UserBlockUpdate,
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
    ReferralOut,
    ReferralReview,
)
from ..auth import require_admin, require_manager, UserCtx

router = APIRouter(prefix="/api/admin", tags=["admin"])


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
            "user_email": user.email,
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
        },
        ip_address=get_actor_ip(request),
    )
    
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
    admin: UserCtx = Depends(require_manager),
    db: Session = Depends(get_db),
):
    """
    Create a new item.
    Manager or admin only.
    """
    new_item = Item(**item_data.model_dump())
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
        },
        ip_address=get_actor_ip(request),
    )
    
    return new_item


@router.put("/items/{item_id}", response_model=ItemDetailOut)
def update_item(
    item_id: int,
    item_data: ItemUpdate,
    request: Request,
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
    Permanently delete an item from the database.
    This action cannot be undone.
    Manager or admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    # Store item details before deletion (important for permanent deletes!)
    item_details = {
        "item_name": item.name,
        "category": item.category,
        "price_cents": item.price_cents,
        "weight_oz": item.weight_oz,
        "stock_qty": item.stock_qty,
        "description": item.description,
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
    
    db.delete(item)
    db.commit()
    
    return {
        "ok": True,
        "message": "Item permanently deleted from database",
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
    # Total logs count
    total_logs = db.query(func.count(AuditLog.id)).scalar() or 0
    
    # Logs in last 24 hours
    last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
    logs_last_24h = db.query(func.count(AuditLog.id)).filter(
        AuditLog.timestamp >= last_24h
    ).scalar() or 0
    
    # Logs in last 7 days
    last_7d = datetime.now(timezone.utc) - timedelta(days=7)
    logs_last_7d = db.query(func.count(AuditLog.id)).filter(
        AuditLog.timestamp >= last_7d
    ).scalar() or 0
    
    # Top 10 action types
    top_actions_query = (
        db.query(
            AuditLog.action_type,
            func.count(AuditLog.id).label('count')
        )
        .group_by(AuditLog.action_type)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    top_actions = [
        {"action_type": row[0], "count": row[1]}
        for row in top_actions_query
    ]
    
    # Top 10 actors
    top_actors_query = (
        db.query(
            AuditLog.actor_email,
            func.count(AuditLog.id).label('count')
        )
        .filter(AuditLog.actor_email.isnot(None))
        .group_by(AuditLog.actor_email)
        .order_by(func.count(AuditLog.id).desc())
        .limit(10)
        .all()
    )
    top_actors = [
        {"actor_email": row[0], "count": row[1]}
        for row in top_actors_query
    ]
    
    return AuditLogStats(
        total_logs=total_logs,
        logs_last_24h=logs_last_24h,
        logs_last_7d=logs_last_7d,
        top_actions=top_actions,
        top_actors=top_actors,
    )


# ============ Promotion Referral Management Endpoints ============

@router.get("/referrals", response_model=List[ReferralOut])
def list_referrals(
    status_filter: str = Query("pending", description="Filter by status: all, pending, approved, rejected, cancelled"),
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    List all promotion referrals with optional status filtering.
    Admin only.
    """
    # Build query - get all referrals with status filtering
    stmt = select(PromotionReferral).order_by(PromotionReferral.created_at.desc())
    
    # Filter by status
    if status_filter != "all":
        stmt = stmt.where(PromotionReferral.status == status_filter)
    
    referrals_list = db.execute(stmt).scalars().all()
    
    # Build response - fetch related users for each referral
    referrals = []
    for referral in referrals_list:
        referred_user = db.get(User, referral.referred_user_id)
        referring_manager = db.get(User, referral.referring_manager_id)
        
        if referred_user and referring_manager:
            referrals.append(ReferralOut(
                id=referral.id,
                referred_user_id=referred_user.id,
                referred_user_email=referred_user.email,
                referred_user_name=referred_user.full_name,
                referring_manager_id=referring_manager.id,
                referring_manager_email=referring_manager.email,
                target_role=referral.target_role,
                reason=referral.reason,
                status=referral.status,
                admin_notes=referral.admin_notes,
                created_at=referral.created_at,
                reviewed_at=referral.reviewed_at,
            ))
    
    return referrals


@router.put("/referrals/{referral_id}/approve", status_code=status.HTTP_200_OK)
def approve_referral(
    referral_id: int,
    review_data: ReferralReview,
    request: Request,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Approve a promotion referral and promote the user to manager.
    Admin only.
    """
    referral = db.get(PromotionReferral, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found",
        )
    
    # Can only approve pending referrals
    if referral.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve referral with status '{referral.status}'",
        )
    
    # Get the referred user
    referred_user = db.get(User, referral.referred_user_id)
    if not referred_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referred user not found",
        )
    
    # Store old role for audit log
    old_role = referred_user.role
    
    # Promote user to manager
    referred_user.role = referral.target_role
    
    # Update referral status
    referral.status = "approved"
    referral.reviewed_at = datetime.now(timezone.utc)
    referral.reviewed_by_admin_id = admin.id
    referral.admin_notes = review_data.admin_notes
    
    db.commit()
    db.refresh(referred_user)
    db.refresh(referral)
    
    # Create audit log for role change
    create_audit_log(
        db=db,
        action_type="user_role_updated",
        target_type="user",
        target_id=referred_user.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "old_role": old_role,
            "new_role": referral.target_role,
            "user_email": referred_user.email,
            "via_referral": True,
            "referral_id": referral.id,
        },
        ip_address=get_actor_ip(request),
    )
    
    # Create audit log for referral approval
    create_audit_log(
        db=db,
        action_type="referral_approved",
        target_type="referral",
        target_id=referral.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "referred_user_id": referred_user.id,
            "referred_user_email": referred_user.email,
            "target_role": referral.target_role,
            "admin_notes": review_data.admin_notes,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": f"Referral approved and user promoted to {referral.target_role}",
    }


@router.put("/referrals/{referral_id}/reject", status_code=status.HTTP_200_OK)
def reject_referral(
    referral_id: int,
    review_data: ReferralReview,
    request: Request,
    admin: UserCtx = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Reject a promotion referral.
    Admin only.
    """
    referral = db.get(PromotionReferral, referral_id)
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referral not found",
        )
    
    # Can only reject pending referrals
    if referral.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject referral with status '{referral.status}'",
        )
    
    # Update referral status
    referral.status = "rejected"
    referral.reviewed_at = datetime.now(timezone.utc)
    referral.reviewed_by_admin_id = admin.id
    referral.admin_notes = review_data.admin_notes
    
    db.commit()
    db.refresh(referral)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="referral_rejected",
        target_type="referral",
        target_id=referral.id,
        actor_id=admin.id,
        actor_email=admin.email,
        details={
            "referred_user_id": referral.referred_user_id,
            "target_role": referral.target_role,
            "admin_notes": review_data.admin_notes,
        },
        ip_address=get_actor_ip(request),
    )
    
    return {
        "ok": True,
        "message": "Referral rejected",
    }

