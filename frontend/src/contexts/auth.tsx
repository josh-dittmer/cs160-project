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
    isReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [expires, setExpires] = useState<number | null>(null);
    const [isReady, setIsReady] = useState(false);

    const login = useCallback((newToken: string, newUser: UserInfo, expires: number) => {
        const expiresMs = expires * 1000;
        setToken(newToken);
        setUser(newUser);
        setExpires(expiresMs);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('user_info', JSON.stringify(newUser));
        localStorage.setItem('auth_expires', expires.toString());
        setIsReady(true);
    }, []);

    const logout = useCallback(() => {
        setToken(null);
        setUser(null);
        setExpires(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('auth_expires');
        setIsReady(true);
    }, []);

    const updateUser = useCallback((newUser: UserInfo) => {
        setUser(newUser);
        localStorage.setItem('user_info', JSON.stringify(newUser));
    }, []);

    // Load auth state from localStorage on mount
    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const hydrateAuthState = async () => {
            const storedToken = localStorage.getItem('auth_token');
            const storedUser = localStorage.getItem('user_info');
            const storedExpires = localStorage.getItem('auth_expires');

            if (!storedToken || !storedUser || !storedExpires) {
                if (isMounted) {
                    logout();
                }
                return;
            }

            let parsedUser: UserInfo | null = null;
            try {
                parsedUser = JSON.parse(storedUser);
            } catch (error) {
                console.error('Failed to parse stored user info', error);
                if (isMounted) {
                    logout();
                }
                return;
            }

            const expiresEpochSeconds = Number(storedExpires);
            const expiresAtMs = Number.isFinite(expiresEpochSeconds)
                ? expiresEpochSeconds * 1000
                : NaN;

            if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
                if (isMounted) {
                    logout();
                }
                return;
            }

            if (!isMounted) {
                return;
            }

            setToken(storedToken);
            setUser(parsedUser);
            setExpires(expiresAtMs);
            setIsReady(true);

            try {
                const latestUser = await getCurrentUser(storedToken);
                if (controller.signal.aborted || !isMounted) {
                    return;
                }
                setUser(latestUser);
                localStorage.setItem('user_info', JSON.stringify(latestUser));
            } catch (error) {
                console.error('Failed to refresh session', error);
                if (!controller.signal.aborted && isMounted) {
                    logout();
                }
            }
        };

        hydrateAuthState();

        return () => {
            isMounted = false;
            controller.abort();
        };
    }, [logout]);

    const value = {
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token && !!user,
        isReady,
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

