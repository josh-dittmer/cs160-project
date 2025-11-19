from fastapi import APIRouter, Depends, Query
from ..schemas import OrderItemsResponse, OrderOut, CartItemOut
from ..auth import get_current_user, UserCtx
from ..database import get_db
from ..models import OrderItem, Order, Item
from ..cart import calculate_cart_total
from sqlalchemy.orm import Session
from typing import Dict

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