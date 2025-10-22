// API utilities for authentication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SignupData {
    email: string;
    password: string;
    full_name?: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface UserInfo {
    id: number;
    email: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: UserInfo;
    expires: number;
}

export interface ErrorResponse {
    detail: string;
}

/**
 * Sign up a new user
 */
export async function signup(data: SignupData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.detail || 'Signup failed');
    }

    return response.json();
}

/**
 * Login an existing user
 */
export async function login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.detail || 'Login failed');
    }

    return response.json();
}

/**
 * Get current user info using the stored token
 */
export async function getCurrentUser(token: string): Promise<UserInfo> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.detail || 'Failed to get user info');
    }

    return response.json();
}

/**
 * Login with Google OAuth
 */
export async function googleAuth(idToken: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            id_token: idToken,
        }),
    });

    if (!response.ok) {
        const error: ErrorResponse = await response.json();
        throw new Error(error.detail || 'Google authentication failed');
    }

    return response.json();
}

