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
                <div className="flex justify-end mt-2">
                    <button
                        onClick={() => window.location.href = `/delivery/${order.id}`}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition"
                    >
                        View Order Detail
                    </button>
                </div>
            </div>
        </div>
    )
}