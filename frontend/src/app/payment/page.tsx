"use client";

import ProfilePicture from "@/components/profile_picture/profile_picture";
import StripePayment from "@/components/stripe_payment/stripe_payment";
import { useAuth } from "@/contexts/auth";
import { CartContext } from "@/contexts/cart";
import { useUpsertCartItemMutation } from "@/lib/mutations/cart_item/upsert";
import { useCartItemsQuery } from "@/lib/queries/cart_items";
import { Trash } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";
import "./payment.css";



// Type of shipping(can update it later)
type ShippingMethod = "standard";

// Type of payment
type PayMethod = "card" | "paypal" | "applepay";

export default function PaymentPage() {
    const { data: cartItems, isPending } = useCartItemsQuery();
    const cartContext = useContext(CartContext);
    const router = useRouter();
    const { mutate, isPending: isMutating } = useUpsertCartItemMutation();
    const { user } = useAuth();

    const [shipping, setShipping] = useState("standard");
    /*const [discount, setDiscount] = useState("Currently unavailable.");*/

    const inc = (itemId: number, currentQty: number) => {
        mutate({ item_id: itemId, quantity: currentQty + 1 });
    };
    const dec = (itemId: number, currentQty: number) => {
        const next = currentQty - 1;
        // if you want "0" to remove the line(delete):
        mutate({ item_id: itemId, quantity: Math.max(0, next) });
    };

    const removeLine = (itemId: number) => {
        // set quantity to 0 to remove
        mutate({ item_id: itemId, quantity: 0 });
    };

    if (!cartItems) return;

    // calcualte total weight
    const totalWeightOz = cartItems.total_weight_oz;
    const totalWeightLbs = totalWeightOz / 16;

    // free shipping for under 20 lbs, or pay $10
    const shippingFee = cartItems.shipping_waived ? 0 : cartItems.total_shipping_cents / 100;

    // calculate totals dynamically
    const itemsTotal = cartItems.total_item_cents / 100;

    const total = itemsTotal + shippingFee;

    return (
        <>
            <main className="checkout">
                {/*<header className="checkout__title">
                    <h1>Checkout</h1>
                    <p>Shipping charges and discount codes applied at checkout.</p>
                </header>*/}


                <div className="checkout__grid">
                    {/* LEFT COLUMN */}
                    <section className="leftcol">
                        {/* Customer summary */}
                        <div className="card">
                            <div className="card__head card__head--row">
                                <div className="flex justify-center items-center gap-2">
                                    <ProfilePicture user={user ?? undefined} size={10} />
                                    <span className="avatar__name">{user?.full_name}</span>
                                </div>
                                <button className="link">Change address</button>
                            </div>

                            <div className="card__body grid grid-cols-[1fr_1fr] gap-4">
                                <div>
                                    <div className="meta__label">Email</div>
                                    <div className="meta__value">{user?.email}</div>
                                </div>
                                <div className="overflow-hidden">
                                    <div className="meta__label">Address</div>
                                    <div className="meta__value truncate text-ellipsis">
                                        {user?.address}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Shipping details */}
                        <div className="card">
                            <div className="card__head card__head--row">
                                <h2 className="title-with-icon">
                                    Shipping Details
                                    <span className="info-icon" title="Orders under 20 lbs ship free; 20 lbs or more add a $10 delivery charge.">!</span>
                                </h2>
                            </div>

                            {/* Product row */}
                            <div className="card__body">
                                {/* Product rows from Cart */}
                                <div className="card__body">
                                    {isPending && <p>Loading items...</p>}
                                    {!isPending && (!cartItems || cartItems.items.length === 0) && (
                                        <p>Your cart is empty.</p>
                                    )}

                                    {!isPending && cartItems?.items.map((ci) => (
                                        <div key={ci.item.id} className="product pb-2">
                                            {/* Thumb */}
                                            {ci.item.image_url ? (
                                                ci.item.image_url.startsWith('data:') ? (
                                                    <img
                                                        src={ci.item.image_url}
                                                        alt={ci.item.name}
                                                        className="product__thumb"
                                                    />
                                                ) : (
                                                    <Image
                                                        src={ci.item.image_url}
                                                        width={80}
                                                        height={80}
                                                        alt={ci.item.name}
                                                        className="product__thumb object-cover"
                                                    />
                                                )
                                            ) : (
                                                <div className="product__thumb bg-gray-200 flex items-center justify-center">🛍️</div>
                                            )}

                                            {/* Main */}
                                            <div className="product__main">
                                                <div className="product__name">{ci.item.name}</div>

                                                {/* Qty controls (read-only input, +/- buttons) */}
                                                <div className="qty">
                                                    <label className="qty__label">Qty</label>
                                                    <div className="qty__control">
                                                        <button
                                                            type="button"
                                                            aria-label="Decrease"
                                                            disabled={isMutating}
                                                            onClick={() => dec(ci.item.id, ci.quantity)}
                                                        >−</button>

                                                        <input
                                                            aria-label="Quantity"
                                                            readOnly
                                                            value={ci.quantity}
                                                        />

                                                        <button
                                                            type="button"
                                                            aria-label="Increase"
                                                            disabled={isMutating}
                                                            onClick={() => inc(ci.item.id, ci.quantity)}
                                                        >＋</button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Price */}
                                            <div className="product__price">
                                                <div className="price price--detail">
                                                    ${(ci.item.price_cents / 100).toFixed(2)}
                                                </div>
                                            </div>

                                            {/* Remove */}
                                            <div className="bg-bg-medium grid grid-cols-[1fr_1fr_1fr] w-9.5 rounded-full shadow-xl/20">
                                                <button
                                                    className="iconbtn hover:bg-bg-dark rounded-full p-2"
                                                    aria-label="Remove"
                                                    disabled={isMutating}
                                                    onClick={() => removeLine(ci.item.id)}
                                                >
                                                    <Trash className="text-fg-dark" width={20} height={20} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>


                            </div>

                            {/* Shipping methods */}
                            <div className="card__body card__body--stack">
                                <label className="shipopt">
                                    <div className="shipopt__left">
                                        <input
                                            type="radio"
                                            name="ship"
                                            checked={shipping === "standard"}
                                            onChange={() => setShipping("standard")}
                                        />
                                        <div>
                                            <div className="shipopt__title">Standard</div>
                                            <div className="shipopt__note">
                                                Est. time, may make additional stops along the way
                                            </div>
                                        </div>
                                    </div>
                                    <div className="shipping__note">
                                        <p>Total weight: {totalWeightLbs.toFixed(2)} lbs</p>
                                        {totalWeightLbs < 20 ? (
                                            <p className="text-green-600">✅ Free shipping applied</p>
                                        ) : (
                                            <p className="text-red-600">Shipping fee: $10 (over 20 lbs)</p>
                                        )}
                                    </div>
                                    <div className="shipopt__price">$10</div>
                                </label>
                            </div>
                        </div>
                        {/* Payment */}
                        <div className="card">
                            <div className="card__head">
                                <h2>Payment</h2>
                            </div>

                            <div className="card__body card__body--stack">
                                <StripePayment />
                            </div>

                            {/*<div className="card__foot">
                                <button className="cta">COMPLETE PURCHASE</button>
                                <p className="legal">
                                    By clicking “Complete purchase”, you agree to our Terms and confirm you’ve read the Privacy Policy.
                                </p>
                            </div>*/}
                        </div>
                    </section>

                    {/* RIGHT COLUMN — Summary */}
                    <aside className="rightcol">
                        <div className="card">
                            <div className="card__head">
                                <h2>Summary</h2>
                            </div>
                            <div className="card__body card__body--stack">
                                <div className="kv">
                                    <span>Items in the Cart</span>
                                    <span>${itemsTotal.toFixed(2)}</span>
                                </div>
                                <div className="kv">
                                    <span>Shipping</span>
                                    <span>${shippingFee.toFixed(2)}</span>
                                </div>
                                <hr />
                                <div className="kv kv--total">
                                    <span>Total</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                        {/*<div className="card">
                            <div className="card__body">
                                <label className="label">DISCOUNT CODE / GIFT CARD</label>
                                <div className="row">
                                    <input
                                        className="inp"
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value)}
                                        placeholder="Enter code"
                                    />
                                    <button className="btn">Apply</button>
                                </div>
                            </div>
                        </div>*/}
                    </aside>
                </div>
            </main>
        </>
    );
}
