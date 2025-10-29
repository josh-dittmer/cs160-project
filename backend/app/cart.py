from .schemas import CartItemOut
from typing import List
from collections import namedtuple

# Cart utilities

CartPriceData = namedtuple("CartPriceData", [
    "total_item_cents",
    "total_shipping_cents",
    "total_weight_oz",
    "shipping_waived",
    "total_cents"
])

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