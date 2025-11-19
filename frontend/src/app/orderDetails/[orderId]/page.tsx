"use client";

import DeliveryProgress from "@/components/delivery_progress/delivery_progress"
import { useOrdersQuery } from "@/lib/queries/orders";
import { useParams } from "next/navigation"; 
import OrderMap from "@/components/order_map/order_map"; 


export default function OrderDtailsPage() {

    const { orderId } = useParams();
    const numericOrderId = Number(orderId);
    const { data: ordersData } = useOrdersQuery();

    // ActiveOrder
    const activeOrder = ordersData?.orders.find(
        (o) => o.id === numericOrderId
    );

    if (!activeOrder) {
        return <div>Loading...</div>;
    }

    return (
        <main className="bg-gray-50 p-8 min-h-screen">

            {/* TOP BAR */}
            <div className="relative mb-6 flex items-center justify-center">
                <button
                    onClick={() => window.location.href = "/home/dashboard"}
                    className="absolute left-0 bg-gray-200 hover:bg-gray-300 text-green-600 px-4 py-2 rounded-full text-sm transition"
                >
                    ← Return Home
                </button>

                <h1 className="text-2xl font-semibold text-center">
                    Order Details
                </h1>
            </div>

            <div className="flex flex-col gap-6 max-w-4xl mx-auto">

                {/* ORDER SUMMARY */}
                <section className="bg-white rounded-2xl shadow p-5 flex items-start gap-5">
                    <div className="bg-green-100 text-green-600 w-12 h-12 rounded-full flex items-center justify-center">
                        📦
                    </div>
                    <div className="flex-1">
                        <h2 className="font-medium text-lg">Order Summary</h2>
                        <div className="text-gray-600 text-sm space-y-1">
                            <p>Order Number: {activeOrder.id}</p>
                            <p>Date Placed: {activeOrder.created_at}</p>
                            <p>Delivery Address: {activeOrder.display_address}</p>
                            <p>Products: {activeOrder.items.length}</p>
                            <p>Total Weight: {(activeOrder.total_weight_oz / 16).toFixed(2)} lbs</p>
                            <p>Total Amount: ${(activeOrder.total_cents / 100).toFixed(2)}</p>
                        </div>
                    </div>
                </section>

                {/* ITEMS LIST */}
                <section className="bg-white rounded-2xl shadow p-5 flex flex-col gap-4">
                    <h2 className="font-medium text-lg">Items Purchased</h2>

                    <div className="flex flex-col gap-4">
                        {activeOrder.items.map((ci) => (
                            <div
                                key={ci.item.id}
                                className="flex items-center gap-4 border-b border-gray-200 pb-4"
                            >
                                <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                                    {ci.item.image_url ? (
                                        <img
                                            src={ci.item.image_url}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        "🛒"
                                    )}
                                </div>

                                <div className="flex-1">
                                    <p className="font-medium">{ci.item.name}</p>
                                    <p className="text-sm text-gray-600">
                                        Qty: {ci.quantity}
                                    </p>
                                </div>

                                <p className="font-semibold text-gray-800">
                                    ${(ci.item.price_cents / 100).toFixed(2)}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* DELIVERY PROGRESS */}
                <section className="bg-white rounded-2xl shadow p-5 flex items-center gap-5">
                    <div className="bg-purple-100 text-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
                        🚚
                    </div>

                    <div className="flex-1">
                        <DeliveryProgress order={activeOrder} />
                    </div>
                </section>

                {/* TRACKING */}
                <section className="bg-white rounded-2xl shadow p-5 flex items-start gap-5">
                    <div className="bg-yellow-100 text-yellow-600 w-12 h-12 rounded-full flex items-center justify-center">
                        🤖
                    </div>
                    <div className="flex-1">
                        <h2 className="font-medium text-lg">Tracking Info</h2>
                        <p>Status: {activeOrder.status}</p>
                    </div>
                </section>

                {/* MAP */}
                <section className="bg-white rounded-2xl shadow overflow-hidden h-[400px]">
                    <OrderMap order={activeOrder} />
                </section>
            </div>
        </main>
    );
}
