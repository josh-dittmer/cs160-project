from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func

from ..database import get_db
from ..models import User, Item, Order, OrderItem
from ..audit import create_audit_log, get_actor_ip
from ..schemas import (
    ItemDetailOut,
    ItemStockUpdate,
    OrderListEmployee,
    OrderDetailEmployee,
    OrderUserInfo,
    OrderItemAdmin,
)
from ..auth import require_employee, UserCtx

router = APIRouter(prefix="/api/employee", tags=["employee"])


# ============ Inventory Management Endpoints (Limited Access) ============

@router.get("/items", response_model=List[ItemDetailOut])
def list_items_employee(
    query: Optional[str] = Query(None, description="Search by name or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    status: str = Query("active", description="Filter by status: active, inactive, or all"),
    low_stock_threshold: Optional[int] = Query(None, ge=0, description="Filter items with stock below this threshold"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    List all items with filtering and pagination.
    Employees can view the full inventory.
    Employee, manager, or admin only.
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
def get_categories_employee(
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    Get all unique categories from items.
    Returns a sorted list of category names.
    Employee, manager, or admin only.
    """
    stmt = select(Item.category).where(
        Item.category.isnot(None),
        Item.category != ""
    ).distinct().order_by(Item.category)
    
    categories = db.execute(stmt).scalars().all()
    return list(categories)


@router.get("/items/{item_id}", response_model=ItemDetailOut)
def get_item_employee(
    item_id: int,
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    Get single item details (including inactive items).
    Employee, manager, or admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    return item


@router.put("/items/{item_id}/stock", response_model=ItemDetailOut)
def update_item_stock(
    item_id: int,
    stock_data: ItemStockUpdate,
    request: Request,
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    Update item stock quantity only.
    Employees can ONLY update the stock_qty field, no other fields.
    Employee, manager, or admin only.
    """
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found",
        )
    
    # Store old stock quantity for audit log
    old_stock_qty = item.stock_qty
    
    # Update only stock quantity
    item.stock_qty = stock_data.stock_qty
    db.commit()
    db.refresh(item)
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type="item_stock_updated",
        target_type="item",
        target_id=item.id,
        actor_id=employee.id,
        actor_email=employee.email,
        details={
            "item_name": item.name,
            "old_stock_qty": old_stock_qty,
            "new_stock_qty": stock_data.stock_qty,
            "actor_role": employee.role,
        },
        ip_address=get_actor_ip(request),
    )
    
    return item


# ============ Order Management Endpoints (Read-Only) ============

@router.get("/orders", response_model=List[OrderListEmployee])
def list_orders_employee(
    query: Optional[str] = Query(None, description="Search by order ID, user email, or payment intent ID"),
    status_filter: str = Query("all", description="Filter by status: all, delivered, pending"),
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    from_date: Optional[str] = Query(None, description="Filter orders from date (ISO format)"),
    to_date: Optional[str] = Query(None, description="Filter orders to date (ISO format)"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    List all orders with filtering, search, and pagination.
    Employees have read-only access to view orders.
    Employee, manager, or admin only.
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
    
    # Convert results to OrderListEmployee objects
    orders = []
    for row in results:
        orders.append(OrderListEmployee(
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


@router.get("/orders/{order_id}", response_model=OrderDetailEmployee)
def get_order_detail_employee(
    order_id: int,
    employee: UserCtx = Depends(require_employee),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific order including all items.
    Employees have read-only access.
    Employee, manager, or admin only.
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
    
    return OrderDetailEmployee(
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

