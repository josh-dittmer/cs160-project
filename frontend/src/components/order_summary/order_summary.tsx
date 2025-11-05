'use client'

import { CartItemT, OrderT } from "@/lib/api/models";
import { Dot, Scale } from "lucide-react";
import Image from "next/image";

function ItemSnippet({ cartItem }: { cartItem: CartItemT }) {
    return (
        <div className="grid grid-cols-[40px_auto] text-fg-dark">
            <span className="font-bold">{cartItem.quantity}x</span>
            <a className="hover:underline" href={`/home/item/${cartItem.item.id}`}>
                <span>{cartItem.item.name}</span>
            </a>
        </div>
    )
}

export default function OrderSummary({ order }: { order: OrderT }) {
    const maxItemsDisplayed = 3;

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center w-full">
                <div className="w-full flex flex-col gap-2">
                    <div className="flex">
                        <p className="text-fg-medium">{order.items.length} products</p>
                        <Dot className="text-fg-medium" />
                        <p className="text-fg-medium">${(order.total_cents / 100).toFixed(2)}</p>
                        <Dot className="text-fg-medium" />
                        <div className="flex gap-1 items-center">
                            <Scale width={15} height={15} className="text-fg-medium" />
                            <p className="text-fg-medium">{(order.total_weight_oz / 16).toFixed(2)} lbs</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center w-full">
                <div className="grid grid-cols-[1fr_1fr] w-full">
                    <div className="pl-4 text-sm flex flex-col">
                        {order.items.slice(0, maxItemsDisplayed).map((cartItem) =>
                            <ItemSnippet key={cartItem.item.id} cartItem={cartItem} />
                        )}
                        {order.items.length > maxItemsDisplayed && (
                            <div className="grid grid-cols-[40px_auto]">
                                <span></span>
                                <a className="hover:underline" href="#">
                                    <p className="text-fg-medium">and {order.items.length - maxItemsDisplayed} other(s)</p>
                                </a>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-center items-center">
                        {order.items[0] && order.items[0].item.image_url && (
                            order.items[0].item.image_url.startsWith('data:') ? (
                                <img
                                    src={order.items[0].item.image_url}
                                    alt={"Item"}
                                    className="object-cover w-20 h-20 rounded-xl border-2 border-fg-dark transform-[translate(50%,25%)]"
                                />
                            ) : (
                                <Image
                                    src={order.items[0].item.image_url}
                                    width={50}
                                    height={50}
                                    alt={"Item"}
                                    className="object-cover w-20 h-20 rounded-xl border-2 border-fg-dark transform-[translate(50%,25%)]"
                                />
                            )
                        )}
                        {order.items[1] && order.items[1].item.image_url && (
                            order.items[1].item.image_url.startsWith('data:') ? (
                                <img
                                    src={order.items[1].item.image_url}
                                    alt={"Item"}
                                    className="object-cover w-20 h-20 rounded-xl border-2 border-fg-dark"
                                />
                            ) : (
                                <Image
                                    src={order.items[1].item.image_url}
                                    width={50}
                                    height={50}
                                    alt={"Item"}
                                    className="object-cover w-20 h-20 rounded-xl border-2 border-fg-dark"
                                />
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}