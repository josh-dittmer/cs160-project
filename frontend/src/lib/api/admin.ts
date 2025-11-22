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
  reports_to: number | null;
}

export interface ItemAdmin {
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

export interface ItemCreateData {
  name: string;
  price_cents: number;
  weight_oz: number;
  category?: string | null;
  image_url?: string | null;
  video_url?: string | null;
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
  video_url?: string | null;
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
  role: string,
  managerId?: number,
  subordinateReassignments?: Record<number, number>
): Promise<any> {
  const body: any = { role };
  if (managerId !== undefined) {
    body.manager_id = managerId;
  }
  if (subordinateReassignments !== undefined) {
    body.subordinate_reassignments = subordinateReassignments;
  }
  
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

export async function updateEmployeeManager(
  token: string,
  userId: number,
  managerId: number
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/manager`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ manager_id: managerId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update employee manager');
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
  data: ItemCreateData,
  autoCase: boolean = true,
  allowSpecialChars: boolean = false,
  allowNumbers: boolean = false
): Promise<ItemAdmin> {
  const url = new URL(`${API_BASE_URL}/api/admin/items`);
  url.searchParams.append('auto_case', autoCase.toString());
  url.searchParams.append('allow_special_chars', allowSpecialChars.toString());
  url.searchParams.append('allow_numbers', allowNumbers.toString());
  
  const response = await fetch(url.toString(), {
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
  data: ItemUpdateData,
  autoCase: boolean = true,
  allowSpecialChars: boolean = false,
  allowNumbers: boolean = false
): Promise<ItemAdmin> {
  const url = new URL(`${API_BASE_URL}/api/admin/items/${itemId}`);
  url.searchParams.append('auto_case', autoCase.toString());
  url.searchParams.append('allow_special_chars', allowSpecialChars.toString());
  url.searchParams.append('allow_numbers', allowNumbers.toString());
  
  const response = await fetch(url.toString(), {
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

// ============ Order Management ============

export interface OrderItemAdmin {
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

export interface OrderListAdmin {
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

export interface OrderDetailAdmin {
  id: number;
  user: OrderUserInfo;
  items: OrderItemAdmin[];
  total_cents: number;
  total_weight_oz: number;
  created_at: string;
  delivered_at: string | null;
  payment_intent_id: string | null;
  is_delivered: boolean;
}

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
): Promise<OrderListAdmin[]> {
  const searchParams = new URLSearchParams();
  
  if (params.query) searchParams.append('query', params.query);
  if (params.status_filter) searchParams.append('status_filter', params.status_filter);
  if (params.user_id) searchParams.append('user_id', params.user_id.toString());
  if (params.from_date) searchParams.append('from_date', params.from_date);
  if (params.to_date) searchParams.append('to_date', params.to_date);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.offset) searchParams.append('offset', params.offset.toString());

  const url = `${API_BASE_URL}/api/admin/orders${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  
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
): Promise<OrderDetailAdmin> {
  const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}`, {
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

export async function updateOrderStatus(
  token: string,
  orderId: number,
  delivered: boolean
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ delivered }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update order status');
  }

  return response.json();
}

// ============ AI Image Generation ============

export interface ImageGenerationRequest {
  prompt: string;
  base_image?: string;  // Optional base64-encoded image for editing
}

export interface ImageGenerationResponse {
  image_data: string;  // Base64-encoded data URI
  prompt: string;
}

export async function generateImage(
  token: string,
  prompt: string,
  baseImage?: string
): Promise<ImageGenerationResponse> {
  const requestBody: ImageGenerationRequest = { prompt };
  if (baseImage) {
    requestBody.base_image = baseImage;
  }

  const response = await fetch(`${API_BASE_URL}/api/admin/image/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate image');
  }

  return response.json();
}

export async function checkImageGenerationHealth(token: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/image/health`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to check image generation health');
  }

  return response.json();
}

// ============ AI Video Generation ============

export interface VideoGenerationRequest {
  prompt: string;
  model?: string;  // 'veo-3.1-generate-preview' or 'veo-3.1-fast-generate-preview'
}

export interface VideoGenerationResponse {
  status: string;  // 'processing', 'completed', 'failed'
  video_data?: string;  // Base64-encoded MP4 data URI when completed
  operation_id?: string;  // For polling
  prompt: string;
  message?: string;
}

export interface VideoStatusResponse {
  status: string;
  video_data?: string;
  message?: string;
}

export async function generateVideo(
  token: string,
  prompt: string,
  model: string = 'veo-3.1-fast-generate-preview'
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/admin/video/generate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, model }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to start video generation');
  }

  return response.json();
}

export async function generateVideoSync(
  token: string,
  prompt: string,
  model: string = 'veo-3.1-fast-generate-preview'
): Promise<VideoGenerationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/admin/video/generate-sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, model }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to generate video');
  }

  return response.json();
}

export async function checkVideoStatus(
  token: string,
  operationId: string
): Promise<VideoStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/admin/video/status/${operationId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to check video status');
  }

  return response.json();
}

export async function deleteVideoOperation(
  token: string,
  operationId: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/video/operation/${operationId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to delete operation');
  }

  return response.json();
}

export async function checkVideoGenerationHealth(token: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/admin/video/health`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to check video generation health');
  }

  return response.json();
}

// ============ Audit Log Types ============

export interface AuditLog {
  id: number;
  action_type: string;
  actor_id: number | null;
  actor_email: string | null;
  target_type: string;
  target_id: number;
  details: string | null;
  ip_address: string | null;
  timestamp: string;
}

export interface AuditLogStats {
  total_logs: number;
  logs_last_24h: number;
  logs_last_7d: number;
  top_actions: Array<{ action_type: string; count: number }>;
  top_actors: Array<{ actor_email: string; count: number }>;
}

export interface AuditLogFilters {
  action_type?: string;
  actor_email?: string;
  target_type?: string;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

// ============ Audit Log Functions ============

export async function listAuditLogs(
  token: string,
  filters?: AuditLogFilters
): Promise<AuditLog[]> {
  const params = new URLSearchParams();
  
  if (filters?.action_type) params.append('action_type', filters.action_type);
  if (filters?.actor_email) params.append('actor_email', filters.actor_email);
  if (filters?.target_type) params.append('target_type', filters.target_type);
  if (filters?.from_date) params.append('from_date', filters.from_date);
  if (filters?.to_date) params.append('to_date', filters.to_date);
  if (filters?.limit) params.append('limit', filters.limit.toString());
  if (filters?.offset) params.append('offset', filters.offset.toString());

  const url = `${API_BASE_URL}/api/admin/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch audit logs');
  }

  return response.json();
}

export async function getAuditLogStats(token: string): Promise<AuditLogStats> {
  const response = await fetch(`${API_BASE_URL}/api/admin/audit-logs/stats`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch audit log stats');
  }

  return response.json();
}

// Manager user management - promote customer to employee
export async function managerUpdateUserRole(
  token: string,
  userId: number,
  role: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/manager/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update user role');
  }
}

// Manager block user
export async function managerBlockUser(
  token: string,
  userId: number,
  isActive: boolean
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/manager/users/${userId}/block`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to block/unblock user');
  }
}

