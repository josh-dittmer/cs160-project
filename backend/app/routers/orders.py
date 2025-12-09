from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from ..schemas import OrderItemsResponse, OrderOut, CartItemOut
from ..auth import get_current_user, UserCtx
from ..database import get_db
from ..models import OrderItem, Order, Item, OrderStatus
from ..cart import calculate_cart_total
from ..audit import create_audit_log, get_actor_ip
from sqlalchemy.orm import Session
from typing import Dict
from datetime import datetime

router = APIRouter(prefix="/api", tags=["orders"])

@router.get("/orders", response_model=OrderItemsResponse)
def list_order_items(
    limit: int = Query(10, ge=1, le=50, description="Maximum number of orders"),
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> OrderItemsResponse:
    orders_res = db.query(OrderItem, Order, Item).join(Order).join(Item).filter(
        Order.user_id == user.id
    ).order_by(Order.created_at.desc())

    orders: Dict[int, OrderOut] = {}

    for row in orders_res:
        oi: OrderItem = row[0]
        o: Order = row[1]
        i: Item = row[2]

        if not o.id in orders:
            orders[o.id] = OrderOut(
                id=o.id,
                user_id=o.user_id,
                total_cents=0,
                total_weight_oz=0,
                created_at=o.created_at,
                delivered_at=o.delivered_at,
                status=o.status.value,
                display_address=o.display_address,
                latitude=o.latitude,
                longitude=o.longitude,
                items=[]
            )

        orders[o.id].items.append(CartItemOut(
            quantity=oi.quantity,
            item=i
        ))

    for order in orders.values():
        price_data = calculate_cart_total(order.items)
        order.total_cents = price_data.total_item_cents if price_data.shipping_waived else price_data.total_cents
        order.total_weight_oz = price_data.total_weight_oz

    return OrderItemsResponse(
        orders=orders.values()
    )


@router.post("/orders/{order_id}/cancel", response_model=OrderOut)
def cancel_order(
    order_id: int,
    request: Request,
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> OrderOut:
    """
    Cancel an order. Only allows cancellation if order is still in PACKING status.
    Creates an audit log entry that admins and managers can view.
    """
    # Get the order
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == user.id
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Check if order can be canceled (only PACKING status)
    if order.status != OrderStatus.PACKING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order with status '{order.status.value}'. Only orders in 'packing' status can be canceled."
        )

    # Store original status for audit log
    original_status = order.status.value

    # Cancel the order
    order.status = OrderStatus.CANCELED
    order.canceled_at = datetime.utcnow()
    db.add(order)
    db.commit()
    db.refresh(order)

    # Restore inventory for canceled order items
    order_items_to_restore = db.query(OrderItem, Item).join(Item).filter(
        OrderItem.order_id == order.id
    ).all()

    for oi, item in order_items_to_restore:
        # Add back the quantity that was ordered
        item.stock_qty += oi.quantity
        db.add(item)

    db.commit()

    # Create audit log for order cancellation
    create_audit_log(
        db=db,
        action_type="order_canceled",
        target_type="order",
        target_id=order.id,
        actor_id=user.id,
        actor_email=user.email,
        details={
            "order_id": order.id,
            "user_id": order.user_id,
            "original_status": original_status,
            "new_status": order.status.value,
            "canceled_at": order.canceled_at.isoformat() if order.canceled_at else None,
            "display_address": order.display_address,
            "reason": "User-initiated cancellation",
            "items_restored": [
                {
                    "item_id": oi.item_id,
                    "item_name": item.name,
                    "quantity_restored": oi.quantity
                }
                for oi, item in order_items_to_restore
            ]
        },
        ip_address=get_actor_ip(request),
    )

    # Build response with order items
    order_items = db.query(OrderItem, Item).join(Item).filter(
        OrderItem.order_id == order.id
    ).all()

    response = OrderOut(
        id=order.id,
        user_id=order.user_id,
        total_cents=0,
        total_weight_oz=0,
        created_at=order.created_at,
        delivered_at=order.delivered_at,
        status=order.status,
        display_address=order.display_address,
        latitude=order.latitude,
        longitude=order.longitude,
        items=[]
    )

    for oi, item in order_items:
        response.items.append(CartItemOut(
            quantity=oi.quantity,
            item=item
        ))

    # Calculate totals
    price_data = calculate_cart_total(response.items)
    response.total_cents = price_data.total_item_cents if price_data.shipping_waived else price_data.total_cents
    response.total_weight_oz = price_data.total_weight_oz

    return response