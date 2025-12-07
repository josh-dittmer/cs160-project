from fastapi import APIRouter, Depends, HTTPException, status
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
    needs_commit = False

    for row in items:
        ci: CartItem = row[0]
        it: Item = row[1]
        
        if it.stock_qty == 0:
            db.delete(ci)
            needs_commit = True
            continue
        
        if ci.quantity > it.stock_qty:
            ci.quantity = it.stock_qty
            needs_commit = True
        
        cart_item = CartItemOut(
            quantity=ci.quantity,
            item=it
        )
        cart_items.append(cart_item)

    if needs_commit:
        db.commit()

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
    item = db.query(Item).filter_by(id=payload.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")
    
    cart_item = db.query(CartItem).filter_by(
        user_id=user.id, item_id=payload.item_id
    ).first()

    current_quantity = cart_item.quantity if cart_item else 0

    if payload.quantity <= 0:
        if cart_item:
            db.delete(cart_item)
        db.commit()
        return {"ok": True}
    
    is_increasing = payload.quantity > current_quantity
    
    if is_increasing and payload.quantity > item.stock_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {item.stock_qty}, Requested: {payload.quantity}"
        )

    if cart_item:
        cart_item.quantity = payload.quantity
    else:
        db.add(CartItem(
            quantity=payload.quantity,
            item_id=payload.item_id,
            user_id=user.id
        ))

    db.commit()
    
    return {"ok": True}