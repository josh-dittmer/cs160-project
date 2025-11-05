import { OrderT } from "@/lib/api/models";
import OrderSummary from "../order_summary/order_summary";

export default function ActiveOrderCard({ order }: { order: OrderT }) {
    return (
        <div className="w-full p-3 border border-bg-dark rounded-xl max-w-2xl grid grid-rows-[175px_auto]">
            <div className="flex flex-col gap-2 w-full">
                <div className="border-b border-bg-dark pb-1">
                    <h2 className="text-fg-dark font-bold">
                        {order.status === 'packing' && (
                            <span>Packing your order...</span>
                        )}
                        {order.status === 'shipped' && (
                            <span>Your order is on the way!</span>
                        )}
                    </h2>
                </div>
                <OrderSummary order={order} />
            </div>
            <div className="bg-green-300">
                <p>Test</p>
            </div>
        </div>
    )
}