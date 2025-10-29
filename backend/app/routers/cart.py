from fastapi import APIRouter, Depends, status
from typing import List
from ..models import Item, CartItem
from ..schemas import CartItemOut, CartItemIn, CartItemsResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user, UserCtx
from ..cart import calculate_cart_total, CartPriceData

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
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cart_item = db.query(CartItem).filter_by(
        user_id=user.id, item_id=payload.item_id
    ).first()

    if cart_item:
        if payload.quantity <= 0:
            db.delete(cart_item)
        else:
            cart_item.quantity = payload.quantity
    else:
        db.add(CartItem(
            quantity=payload.quantity,
            item_id=payload.item_id,
            user_id=user.id
        ))

    db.commit()
    return {"ok": True}