import { CartItemT, OrderT } from "@/lib/api/models";
import { formatDate, formatTime } from "@/lib/util/date";
import { Dot, Receipt, Scale, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
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

export default function OrderCard({ order }: { order: OrderT }) {
    const maxItemsDisplayed = 2;

    if (!order.delivered_at) return;

    const createdDateStr = formatDate(new Date(order.created_at));

    const deliveredDate = new Date(order.delivered_at);
    const deliveredDateStr = formatTime(deliveredDate);

    return (
        <div className="w-full p-3 border border-bg-dark rounded-xl max-w-2xl grid grid-rows-[auto_100px_auto]">
            <div className="flex items-center w-full">
                <div className="w-full flex flex-col gap-2">
                    <div className="border-b border-bg-dark pb-1">
                        < h2 className="text-fg-dark font-bold" > {createdDateStr}</h2 >
                    </div >
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
            <div className="flex items-center">
                <div className="w-full flex flex-col gap-2">
                    <div>
                        <p className="text-fg-medium">Delivered at {deliveredDateStr}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.button
                            whileTap={{ scale: 0.99 }}
                            className="text-fg-dark bg-bg-medium p-3 rounded-full flex items-center justify-center gap-2 hover:bg-bg-dark"
                        >
                            <ShoppingCart width={15} height={15} className="text-fg-dark" />
                            <p className="text-sm">Order Again</p>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.99 }}
                            className="text-fg-dark bg-bg-medium p-3 rounded-full flex items-center justify-center gap-2 hover:bg-bg-dark"
                        >
                            <Receipt width={15} height={15} className="text-fg-dark" />
                            <p className="text-sm">View Details</p>
                        </motion.button>
                    </div>
                </div>
            </div>
        </div >
    )
}