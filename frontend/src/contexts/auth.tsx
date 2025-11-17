"use client";

import { getCurrentUser, UserInfo } from '@/lib/api/profile';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

interface AuthContextType {
    user: UserInfo | null;
    token: string | null;
    login: (token: string, user: UserInfo, expires: number) => void;
    logout: () => void;
    updateUser: (user: UserInfo) => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [expires, setExpires] = useState<number | null>(null);

    const login = useCallback((newToken: string, newUser: UserInfo, expires: number) => {
        const expiresMs = expires * 1000;
        setToken(newToken);
        setUser(newUser);
        setExpires(expiresMs);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('user_info', JSON.stringify(newUser));
        localStorage.setItem('auth_expires', expires.toString());
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        setExpires(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('auth_expires');
    }, []);

    const updateUser = useCallback((newUser: UserInfo) => {
        setUser(newUser);
        localStorage.setItem('user_info', JSON.stringify(newUser));
    }, []);

    // Load auth state from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user_info');
        const storedExpires = localStorage.getItem('auth_expires');

        if (!storedToken || !storedUser || !storedExpires) {
            logout();
            return;
        }

        let parsedUser: UserInfo | null = null;
        try {
            parsedUser = JSON.parse(storedUser);
        } catch (error) {
            console.error('Failed to parse stored user info', error);
            logout();
            return;
        }

        const expiresEpochSeconds = Number(storedExpires);
        const expiresAtMs = Number.isFinite(expiresEpochSeconds)
            ? expiresEpochSeconds * 1000
            : NaN;

        if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
            logout();
            return;
        }

        setToken(storedToken);
        setUser(parsedUser);
        setExpires(expiresAtMs);

        const controller = new AbortController();

        const refreshUser = async () => {
            try {
                const latestUser = await getCurrentUser(storedToken);
                if (controller.signal.aborted) {
                    return;
                }
                setUser(latestUser);
                localStorage.setItem('user_info', JSON.stringify(latestUser));
            } catch (error) {
                console.error('Failed to refresh session', error);
                if (!controller.signal.aborted) {
                    logout();
                }
            }
        };

        refreshUser();

        return () => controller.abort();
    }, [logout]);

    const value = {
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token && !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

