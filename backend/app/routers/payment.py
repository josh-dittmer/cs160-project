from fastapi import APIRouter, Depends, HTTPException
from typing import List
from ..models import Item, CartItem, Order, OrderItem
from ..schemas import CartItemOut, ConfirmPaymentRequest, ConfirmPaymentResponse, CreatePaymentIntentResponse, CreateSetupIntenetResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..database import get_db
from ..auth import get_current_user, UserCtx
from ..cart import calculate_cart_total, CartPriceData
import stripe
import os
from datetime import datetime

router = APIRouter(prefix="/api/payment", tags=["cart"])

@router.post("/confirm-payment/", response_model=ConfirmPaymentResponse)
def confirm_payment(
    payload: ConfirmPaymentRequest,
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

    cart_items = db.query(CartItem, Item).join(Item).filter(
        CartItem.user_id == user.id
    ).all()

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
        db.commit()
        db.refresh(order_item)

    db.commit()

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

    for row in items:
        ci: CartItem = row[0]
        it: Item = row[1]
        cart_item = CartItemOut(
            quantity=ci.quantity,
            item=it
        )
        cart_items.append(cart_item)

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
        totalCents=price_data.total_item_cents if price_data.shipping_waived else price_data.total_cents
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