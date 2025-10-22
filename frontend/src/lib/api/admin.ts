// API utilities for admin operations

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============ Types ============

export interface UserAdmin {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemAdmin {
  id: number;
  name: string;
  price_cents: number;
  weight_oz: number;
  category: string | null;
  image_url: string | null;
  nutrition_json: string | null;
  description: string | null;
  avg_rating: number;
  ratings_count: number;
  stock_qty: number;
  is_active: boolean;
}

export interface ItemCreateData {
  name: string;
  price_cents: number;
  weight_oz: number;
  category?: string | null;
  image_url?: string | null;
  nutrition_json?: string | null;
  description?: string | null;
  stock_qty?: number;
  is_active?: boolean;
}

export interface ItemUpdateData {
  name?: string;
  price_cents?: number;
  weight_oz?: number;
  category?: string | null;
  image_url?: string | null;
  nutrition_json?: string | null;
  description?: string | null;
  stock_qty?: number;
  is_active?: boolean;
}

// ============ User Management ============

export async function listUsers(token: string): Promise<UserAdmin[]> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch users');
  }

  return response.json();
}

export async function updateUserRole(
  token: string,
  userId: number,
  role: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user role');
  }

  return response.json();
}

export async function blockUser(
  token: string,
  userId: number,
  isActive: boolean
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/block`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to block/unblock user');
  }

  return response.json();
}

// ============ Inventory Management ============

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
): Promise<ItemAdmin[]> {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.append('query', params.query);
  if (params.category) searchParams.append('category', params.category);
  if (params.status) searchParams.append('status', params.status);
  if (params.low_stock_threshold !== undefined) {
    searchParams.append('low_stock_threshold', params.low_stock_threshold.toString());
  }
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const url = `${API_BASE_URL}/api/admin/items${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  
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
  const response = await fetch(`${API_BASE_URL}/api/admin/categories`, {
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

export async function getItem(token: string, itemId: number): Promise<ItemAdmin> {
  const response = await fetch(`${API_BASE_URL}/api/admin/items/${itemId}`, {
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

export async function createItem(
  token: string,
  data: ItemCreateData
): Promise<ItemAdmin> {
  const response = await fetch(`${API_BASE_URL}/api/admin/items`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to create item');
  }

  return response.json();
}

export async function updateItem(
  token: string,
  itemId: number,
  data: ItemUpdateData
): Promise<ItemAdmin> {
  const response = await fetch(`${API_BASE_URL}/api/admin/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update item');
  }

  return response.json();
}

export async function deleteItem(token: string, itemId: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/items/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete item');
  }

  return response.json();
}

export async function activateItem(
  token: string,
  itemId: number,
  isActive: boolean
): Promise<ItemAdmin> {
  const response = await fetch(`${API_BASE_URL}/api/admin/items/${itemId}/activate`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to activate/deactivate item');
  }

  return response.json();
}

export async function permanentlyDeleteItem(token: string, itemId: number): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/items/${itemId}/permanent`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to permanently delete item');
  }

  return response.json();
}

