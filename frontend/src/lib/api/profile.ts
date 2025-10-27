import { Endpoints } from './endpoints';

export interface ProfileUpdateData {
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  state?: string;
  profile_picture?: string;
}

export interface PasswordChangeData {
  current_password: string;
  new_password: string;
}

export interface UserInfo {
  id: number;
  email: string;
  full_name: string | null;
  google_id: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  zipcode: string | null;
  state: string | null;
  profile_picture: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

export async function getCurrentUser(token: string): Promise<UserInfo> {
  const response = await fetch(`${Endpoints.mainApiInternal}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch user data');
  }

  return response.json();
}

export async function updateProfile(token: string, data: ProfileUpdateData): Promise<UserInfo> {
  const response = await fetch(`${Endpoints.mainApiInternal}/api/auth/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update profile');
  }

  return response.json();
}

export async function changePassword(token: string, data: PasswordChangeData): Promise<void> {
  const response = await fetch(`${Endpoints.mainApiInternal}/api/auth/password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to change password');
  }
}

