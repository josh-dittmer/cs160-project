from fastapi import APIRouter, Depends, Request, status
from typing import List
from ..models import Item, CartItem
from ..schemas import CartItemOut, CartItemIn, CartItemsResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user, UserCtx
from ..cart import calculate_cart_total, CartPriceData
from ..audit import create_audit_log, get_actor_ip

router = APIRouter(prefix="/api", tags=["cart"])

@router.get("/cart", response_model=CartItemsResponse)
def list_cart_items(
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> CartItemsResponse:
    items = db.query(CartItem, Item).join(Item).filter(
        CartItem.user_id == user.id
    ).all()

    cart_items: List[CartItemOut] = []

    for row in items:
        ci: CartItem = row[0]
        it: Item = row[1]
        cart_item = CartItemOut(
            quantity=ci.quantity,
            item=it
        )
        cart_items.append(cart_item)

    price_data: CartPriceData = calculate_cart_total(cart_items)

    return CartItemsResponse(
        items=cart_items,
        total_item_cents=price_data.total_item_cents,
        total_shipping_cents=price_data.total_shipping_cents,
        total_cents=price_data.total_cents,
        total_weight_oz=price_data.total_weight_oz,
        shipping_waived=price_data.shipping_waived
    )

@router.post("/cart", status_code=status.HTTP_201_CREATED)
def update_cart(
    payload: CartItemIn,
    request: Request,
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_item = db.query(CartItem).filter_by(
        user_id=user.id, item_id=payload.item_id
    ).first()

    # Get item details for audit log
    item = db.get(Item, payload.item_id)
    item_name = item.name if item else f"Item ID {payload.item_id}"
    
    if cart_item:
        old_quantity = cart_item.quantity
        if payload.quantity <= 0:
            # Remove from cart
            db.delete(cart_item)
            action_type = "cart_item_removed"
            details = {
                "item_id": payload.item_id,
                "item_name": item_name,
                "old_quantity": old_quantity,
            }
        else:
            # Update quantity
            cart_item.quantity = payload.quantity
            action_type = "cart_item_updated"
            details = {
                "item_id": payload.item_id,
                "item_name": item_name,
                "old_quantity": old_quantity,
                "new_quantity": payload.quantity,
            }
    else:
        # Add new item to cart
        db.add(CartItem(
            quantity=payload.quantity,
            item_id=payload.item_id,
            user_id=user.id
        ))
        action_type = "cart_item_added"
        details = {
            "item_id": payload.item_id,
            "item_name": item_name,
            "quantity": payload.quantity,
        }

    db.commit()
    
    # Create audit log
    create_audit_log(
        db=db,
        action_type=action_type,
        target_type="cart",
        target_id=payload.item_id,  # Use item_id as target
        actor_id=user.id,
        actor_email=user.email,
        details=details,
        ip_address=get_actor_ip(request),
    )
    
    return {"ok": True}