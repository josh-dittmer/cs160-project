from .schemas import CartItemOut
from typing import List, Dict, Any
from collections import namedtuple
from sqlalchemy.orm import Session

CartPriceData = namedtuple("CartPriceData", [
    "total_item_cents",
    "total_shipping_cents",
    "total_weight_oz",
    "shipping_waived",
    "total_cents"
])


def adjust_carts_for_stock_change(db: Session, item_id: int, new_stock_qty: int) -> Dict[str, Any]:
    from .models import CartItem
    
    affected_carts = db.query(CartItem).filter(
        CartItem.item_id == item_id,
        CartItem.quantity > new_stock_qty
    ).all()
    
    adjustments = []
    removed_count = 0
    adjusted_count = 0
    
    for cart_item in affected_carts:
        old_quantity = cart_item.quantity
        user_id = cart_item.user_id
        
        if new_stock_qty == 0:
            db.delete(cart_item)
            removed_count += 1
            adjustments.append({
                "user_id": user_id,
                "action": "removed",
                "old_quantity": old_quantity,
                "new_quantity": 0
            })
        else:
            cart_item.quantity = new_stock_qty
            adjusted_count += 1
            adjustments.append({
                "user_id": user_id,
                "action": "reduced",
                "old_quantity": old_quantity,
                "new_quantity": new_stock_qty
            })
    
    if affected_carts:
        db.commit()
    
    return {
        "affected_users": len(adjustments),
        "removed_count": removed_count,
        "adjusted_count": adjusted_count,
        "adjustments": adjustments
    }

def calculate_cart_total(cart_items: List[CartItemOut]):
    total_item_cents = 0
    total_shipping_cents = 0
    total_weight_oz = 0
    
    for cart_item in cart_items:
        total_item_cents += cart_item.item.price_cents * cart_item.quantity
        total_weight_oz += cart_item.item.weight_oz * cart_item.quantity

    total_shipping_cents = 1000

    if total_weight_oz >= 20 * 16:
        shipping_waived = False
    else:
        shipping_waived = True

    total_cents = total_item_cents + total_shipping_cents

    return CartPriceData(
        total_item_cents=total_item_cents,
        total_shipping_cents=total_shipping_cents,
        total_weight_oz=total_weight_oz,
        shipping_waived=shipping_waived,
        total_cents=total_cents
    )