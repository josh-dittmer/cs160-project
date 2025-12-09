const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface CancelOrderResponse {
  id: number;
  user_id: number;
  total_cents: number;
  total_weight_oz: number;
  created_at: string;
  delivered_at: string | null;
  status: string;
  display_address: string;
  latitude: number;
  longitude: number;
  items: any[];
}

/**
 * Cancel an order by order ID
 * @param orderId - The ID of the order to cancel
 * @param token - JWT authentication token
 * @returns Promise with cancel response
 */
export async function cancelOrder(
  orderId: number,
  token: string
): Promise<CancelOrderResponse> {
  const response = await fetch(`${API_BASE_URL}/api/orders/${orderId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to cancel order");
  }

  return response.json();
}
