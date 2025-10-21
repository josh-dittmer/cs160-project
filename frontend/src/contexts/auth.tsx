"use client";

import { UserInfo } from '@/lib/api/auth';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
    user: UserInfo | null;
    token: string | null;
    login: (token: string, user: UserInfo, expires: number) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [expires, setExpires] = useState<number | null>(null);

    // Load auth state from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('auth_token');
        const storedUser = localStorage.getItem('user_info');
        const storedExpires = localStorage.getItem('auth_expires');

        if (!storedExpires || parseInt(storedExpires, 10) > Date.now()) {
            return;
        }

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = (newToken: string, newUser: UserInfo, expires: number) => {
        setToken(newToken);
        setUser(newUser);
        setExpires(expires);
        localStorage.setItem('auth_token', newToken);
        localStorage.setItem('user_info', JSON.stringify(newUser));
        localStorage.setItem('auth_expires', expires.toString());
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('auth_expires');
    };

    const value = {
        user,
        token,
        login,
        logout,
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

