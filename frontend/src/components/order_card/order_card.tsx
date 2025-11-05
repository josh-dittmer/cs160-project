import { CartItemT, OrderT } from "@/lib/api/models";
import { formatDate, formatTime } from "@/lib/util/date";
import { Receipt, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
import OrderSummary from "../order_summary/order_summary";

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
    const createdDateStr = formatDate(new Date(order.created_at));
    const deliveredDateStr = order.delivered_at ? 'Delivered at ' + formatTime(new Date(order.delivered_at)) : 'Not delivered';

    return (
        <div className="w-full p-3 border border-bg-dark rounded-xl max-w-2xl grid grid-rows-[175px_auto]">
            <div className="flex flex-col gap-2 w-full">
                <div className="border-b border-bg-dark pb-1">
                    <h2 className="text-fg-dark font-bold" > {createdDateStr}</h2 >
                </div >
                <OrderSummary order={order} />
            </div>
            <div className="flex items-center">
                <div className="w-full flex flex-col gap-2">
                    <div>
                        <p className="text-fg-medium">{deliveredDateStr}</p>
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
        </div>
    )
}