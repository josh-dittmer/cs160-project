from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import List
from ..models import Item, CartItem, Order, OrderItem
from ..schemas import CartItemOut, ConfirmPaymentRequest, ConfirmPaymentResponse, CreatePaymentIntentResponse, CreateSetupIntenetResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..auth import get_current_user, UserCtx
from ..cart import calculate_cart_total, CartPriceData
from ..audit import create_audit_log, get_actor_ip
import stripe
import os
from datetime import datetime

router = APIRouter(prefix="/api/payment", tags=["cart"])

@router.post("/confirm-payment/", response_model=ConfirmPaymentResponse)
def confirm_payment(
    payload: ConfirmPaymentRequest,
    request: Request,
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    print("Confirming payment for user:", user.id)
    intent = stripe.PaymentIntent.retrieve(payload.intentId, client_secret=payload.clientSecret)

    if intent.customer != user.stripe_customer_id:
        raise HTTPException(status_code=403, detail="Unauthorized access to payment intent.")

    if intent.status != 'succeeded':
        raise HTTPException(status_code=400, detail="Payment not successful.")
    
    stmt = select(Order).where(
        Order.payment_intent_id == intent.id
    )
    
    order = db.scalars(stmt).one_or_none()
    if order is not None:
        return ConfirmPaymentResponse(order_id=order.id)
    
    order = Order(
        user_id=user.id,
        payment_intent_id=intent.id,
        delivered_at=None,
        display_address=payload.displayAddress,
        latitude=payload.latitude,
        longitude=payload.longitude
    )

    db.add(order)
    db.commit()
    db.refresh(order)

    print("Creating order with ID:", order.id)

    # Collect cart items for audit log
    cart_items = db.query(CartItem, Item).join(Item).filter(
        CartItem.user_id == user.id
    ).all()
    
    accum_weight_oz = 0

    # Final inventory check before order confirmation
    for row in cart_items:
        ci: CartItem = row[0]
        it: Item = row[1]
        accum_weight_oz += it.weight_oz * ci.quantity
        if ci.quantity > it.stock_qty:
            db.delete(order)  # Rollback order creation
            db.commit()
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{it.name}'. Available: {it.stock_qty}, Requested: {ci.quantity}"
            )
    
    # max weight 200lbs
    if accum_weight_oz > 200 * 16:
        raise HTTPException(
            status_code=400,
            detail=f"Order weight exceeds 200lbs"
        )

    order_items_details = []
    total_amount = 0

    for row in cart_items:
        ci: CartItem = row[0]
        it: Item = row[1]
        order_item = OrderItem(
            order_id=order.id,
            item_id=it.id,
            quantity=ci.quantity
        )
        print("Adding order item: ", it.name)
        db.add(order_item)
        db.delete(ci)
        
        # Deduct ordered quantity from stock
        it.stock_qty -= ci.quantity
        db.add(it)
        
        # Collect details for audit log
        order_items_details.append({
            "item_id": it.id,
            "item_name": it.name,
            "quantity": ci.quantity,
            "price_cents": it.price_cents,
        })
        total_amount += it.price_cents * ci.quantity
        
        db.commit()
        db.refresh(order_item)

    db.commit()
    
    # Create audit log for order creation
    create_audit_log(
        db=db,
        action_type="order_created",
        target_type="order",
        target_id=order.id,
        actor_id=user.id,
        actor_email=user.email,
        details={
            "order_id": order.id,
            "payment_intent_id": intent.id,
            "total_amount_cents": total_amount,
            "item_count": len(order_items_details),
            "items": order_items_details,
        },
        ip_address=get_actor_ip(request),
    )

    return ConfirmPaymentResponse(orderId=order.id)
        

@router.get("/create-payment-intent", response_model=CreatePaymentIntentResponse)
def create_payment_intent(
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> CreatePaymentIntentResponse:
    items = db.query(CartItem, Item).join(Item).filter(
        CartItem.user_id == user.id
    ).all()

    cart_items: List[CartItemOut] = []

    total_weight_oz = 0

    for row in items:
        ci: CartItem = row[0]
        it: Item = row[1]
        cart_item = CartItemOut(
            quantity=ci.quantity,
            item=it
        )
        cart_items.append(cart_item)
        total_weight_oz += ci.quantity * it.weight_oz

    price_data: CartPriceData = calculate_cart_total(cart_items)

    intent = stripe.PaymentIntent.create(
        customer=user.stripe_customer_id,
        amount=price_data.total_cents,
        currency='usd',
        automatic_payment_methods={'enabled': True},
    )
    customer_session = stripe.CustomerSession.create(
        customer=user.stripe_customer_id,
        components={
            "payment_element": {
                "enabled": True,
                "features": {
                    "payment_method_redisplay": "enabled",
                    "payment_method_save": "enabled",
                    "payment_method_save_usage": "on_session",
                    "payment_method_remove": "enabled",
                },
            },
        },
    )

    return CreatePaymentIntentResponse(
        clientSecret=intent.client_secret,
        customerSessionClientSecret=customer_session.client_secret,
        totalCents=price_data.total_item_cents if price_data.shipping_waived else price_data.total_cents,
        totalWeightOz=total_weight_oz
    )

@router.get("/create-setup-intent", response_model=CreateSetupIntenetResponse)
def create_payment_intent(
    user: UserCtx = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> CreateSetupIntenetResponse:
    customer_session = stripe.CustomerSession.create(
        customer=user.stripe_customer_id,
        components={
            "payment_element": {
                "enabled": True,
                "features": {
                    "payment_method_redisplay": "enabled",
                    "payment_method_save": "enabled",
                    "payment_method_save_usage": "on_session",
                    "payment_method_remove": "enabled",
                },
            },
        },
    )
    intent = stripe.SetupIntent.create(
        customer=user.stripe_customer_id,
        automatic_payment_methods={'enabled': True},
    )

    return CreateSetupIntenetResponse(
        clientSecret=intent.client_secret,
        customerSessionClientSecret=customer_session.client_secret
    )