'use client';

import OrderCard from "@/components/order_card/order_card";
import { useOrdersQuery } from "@/lib/queries/orders";

export default function OrdersPage() {
    const { data } = useOrdersQuery();

    return (
        <div className="grid grid-rows-[40px_auto]">
            <div className="border-b border-bg-dark">
                <h1 className="text-fg-dark font-bold text-lg">Completed Orders</h1>
            </div>
            <div className="flex flex-col gap-3 pt-3 pb-3 overflow-y-scroll items-center">
                {data?.orders.map((order) =>
                    <OrderCard key={order.id} order={order} />
                )}
            </div>
        </div>
    )
}