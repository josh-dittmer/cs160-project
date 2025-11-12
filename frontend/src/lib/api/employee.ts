// API utilities for employee operations

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============ Types ============

export interface ItemEmployee {
  id: number;
  name: string;
  price_cents: number;
  weight_oz: number;
  category: string | null;
  image_url: string | null;
  video_url: string | null;
  nutrition_json: string | null;
  description: string | null;
  avg_rating: number;
  ratings_count: number;
  stock_qty: number;
  is_active: boolean;
}

export interface ItemStockUpdate {
  stock_qty: number;
}

export interface OrderItemEmployee {
  id: number;
  quantity: number;
  item_id: number;
  item_name: string;
  item_price_cents: number;
  item_image_url: string | null;
}

export interface OrderUserInfo {
  id: number;
  email: string;
  full_name: string | null;
}

export interface OrderListEmployee {
  id: number;
  user_id: number;
  user_email: string;
  user_full_name: string | null;
  total_cents: number;
  total_items: number;
  created_at: string;
  delivered_at: string | null;
  payment_intent_id: string | null;
  is_delivered: boolean;
}

export interface OrderDetailEmployee {
  id: number;
  user: OrderUserInfo;
  items: OrderItemEmployee[];
  total_cents: number;
  total_weight_oz: number;
  created_at: string;
  delivered_at: string | null;
  payment_intent_id: string | null;
  is_delivered: boolean;
}

// ============ Inventory Management (Limited Access) ============

export interface ListItemsParams {
  query?: string;
  category?: string;
  status?: 'active' | 'inactive' | 'all';
  low_stock_threshold?: number;
  limit?: number;
  offset?: number;
}

export async function listItems(
  token: string,
  params: ListItemsParams = {}
): Promise<ItemEmployee[]> {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.append('query', params.query);
  if (params.category) searchParams.append('category', params.category);
  if (params.status) searchParams.append('status', params.status);
  if (params.low_stock_threshold !== undefined) {
    searchParams.append('low_stock_threshold', params.low_stock_threshold.toString());
  }
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const url = `${API_BASE_URL}/api/employee/items${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch items');
  }

  return response.json();
}

export async function getCategories(token: string): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/employee/categories`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch categories');
  }

  return response.json();
}

export async function getItem(token: string, itemId: number): Promise<ItemEmployee> {
  const response = await fetch(`${API_BASE_URL}/api/employee/items/${itemId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch item');
  }

  return response.json();
}

export async function updateItemStock(
  token: string,
  itemId: number,
  stockQty: number
): Promise<ItemEmployee> {
  const response = await fetch(`${API_BASE_URL}/api/employee/items/${itemId}/stock`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stock_qty: stockQty }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update item stock');
  }

  return response.json();
}

// ============ Order Management (Read-Only) ============

export interface ListOrdersParams {
  query?: string;
  status_filter?: 'all' | 'delivered' | 'pending';
  user_id?: number;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export async function listOrders(
  token: string,
  params: ListOrdersParams = {}
): Promise<OrderListEmployee[]> {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.append('query', params.query);
  if (params.status_filter) searchParams.append('status_filter', params.status_filter);
  if (params.user_id) searchParams.append('user_id', params.user_id.toString());
  if (params.from_date) searchParams.append('from_date', params.from_date);
  if (params.to_date) searchParams.append('to_date', params.to_date);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const url = `${API_BASE_URL}/api/employee/orders${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch orders');
  }

  return response.json();
}

export async function getOrderDetail(
  token: string,
  orderId: number
): Promise<OrderDetailEmployee> {
  const response = await fetch(`${API_BASE_URL}/api/employee/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch order details');
  }

  return response.json();
}

