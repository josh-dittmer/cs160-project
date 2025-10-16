from fastapi import APIRouter, Depends, status
from typing import List
from ..models import Item, CartItem
from ..schemas import CartItemOut, CartItemIn
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import get_current_user, UserCtx

router = APIRouter(prefix="/api", tags=["cart"])

@router.get("/cart", response_model=List[CartItemOut])
def list_cart_items(
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[CartItemOut]:
    items = db.query(CartItem, Item).join(Item).filter(
        CartItem.user_id == user.id
    ).all()

    cart_items: List[CartItemOut] = []

    for x in items:
        cart_item = CartItemOut(
            quantity=x[0].quantity,
            item=x[1]
        )
        cart_items.append(cart_item)

    return cart_items

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