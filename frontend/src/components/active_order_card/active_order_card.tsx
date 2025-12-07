import { OrderT } from "@/lib/api/models";
import DeliveryProgress from "../delivery_progress/delivery_progress";
import OrderMap from "../order_map/order_map";
import OrderSummary from "../order_summary/order_summary";

export default function ActiveOrderCard({ order }: { order: OrderT }) {
    return (
        <div className="w-full border border-bg-dark rounded-xl max-w-2xl">
            <div className="h-54">
                <OrderMap order={order} />
            </div>
            <div className="p-3 grid grid-rows-[auto_175px]">
                <div>
                    <DeliveryProgress order={order} />
                </div>
                <div className="flex flex-col gap-2 w-full">
                    <OrderSummary order={order} />
                </div>
                <div className="flex justify-between mt-2">
                     <button
                        onClick={() => alert("Cancel order clicked!")} // placeholder
                        className="text-red-600 border border-red-600 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel Order
                    </button>
                    <button
                        onClick={() => window.location.href = `/orderDetails/${order.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition"
                    >
                        View Order Detail
                    </button>
                </div>
            </div>
        </div>
    )
}