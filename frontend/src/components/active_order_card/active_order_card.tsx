"use client";

import { OrderT } from "@/lib/api/models";
import DeliveryProgress from "../delivery_progress/delivery_progress";
import OrderMap from "../order_map/order_map";
import OrderSummary from "../order_summary/order_summary";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder } from "@/lib/api/orders";
import { useAuth } from "@/contexts/auth";
import toast from "react-hot-toast";

export default function ActiveOrderCard({ order }: { order: OrderT }) {
  const router = useRouter();
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleCancelOrder = async () => {
    // Confirm before cancelling
    if (
      !window.confirm(`Are you sure you want to cancel order #${order.id}?`)
    ) {
      return;
    }

    if (!token) {
      toast.error("You must be logged in to cancel an order");
      return;
    }

    setIsLoading(true);
    try {
      await cancelOrder(order.id, token);
      toast.success("Order canceled successfully");
      // Reload the page to update the order status
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel order"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full border border-bg-dark rounded-xl max-w-2xl">
      <div className="h-54">
        <OrderMap order={order} />
      </div>
      <div className="p-3 grid grid-rows-[auto_175px]">
        <div>
          {order.status === "canceled" ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <div>
                  <p className="font-semibold text-red-700">Order Cancelled</p>
                  <p className="text-sm text-red-600">
                    This order will not be delivered
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <DeliveryProgress order={order} />
          )}
        </div>
        <div className="flex flex-col gap-2 w-full">
          <OrderSummary order={order} />
        </div>
        <div className="flex justify-between mt-2">
          <button
            onClick={handleCancelOrder}
            disabled={isLoading || order.status === "canceled"}
            className="text-red-600 border border-red-600 px-4 py-2 rounded-full text-sm font-medium transition hover:bg-red-600 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Cancelling..."
              : order.status === "canceled"
              ? "Order Cancelled"
              : "Cancel Order"}
          </button>
          <button
            onClick={() => router.push(`/orderDetails/${order.id}`)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition"
          >
            View Order Detail
          </button>
        </div>
      </div>
    </div>
  );
}
