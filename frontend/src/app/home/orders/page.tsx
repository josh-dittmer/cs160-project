'use client';

import ActiveOrderCard from "@/components/active_order_card/active_order_card";
import OrderCard from "@/components/order_card/order_card";
import { useOrdersQuery } from "@/lib/queries/orders";

export default function OrdersPage() {
    const { data } = useOrdersQuery();

    const completedOrders = data?.orders.filter((order) =>
        order.status === 'delivered' || order.status === 'canceled')

    const activeOrders = data?.orders.filter((order) =>
        order.status === 'packing' || order.status === 'shipped')

    return (
        <div className="grid grid-rows-[40px_auto]">
            {activeOrders && activeOrders.length > 0 && (
                <>
                    <div className="border-b border-bg-dark">
                        <h1 className="text-fg-dark font-bold text-lg">Active Orders</h1>
                    </div>
                    <div className="flex flex-col gap-3 pt-3 pb-3 overflow-y-scroll items-center">
                        {activeOrders?.map((order) => <ActiveOrderCard key={order.id} order={order} />)}
                    </div>
                </>
            )}
            {completedOrders && completedOrders.length > 0 && (
                <>
                    <div className="border-b border-bg-dark">
                        <h1 className="text-fg-dark font-bold text-lg">Completed Orders</h1>
                    </div>
                    <div className="flex flex-col gap-3 pt-3 pb-3 overflow-y-scroll items-center">
                        {completedOrders?.map((order) => <OrderCard key={order.id} order={order} />)}
                    </div>
                </>
            )}
        </div>
    )
}