"use client";

import { getCurrentUser, UserInfo } from "@/lib/api/profile";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

  const login = useCallback(
    (newToken: string, newUser: UserInfo, expires: number) => {
      const expiresMs = expires * 1000;
      setToken(newToken);
      setUser(newUser);
      setExpires(expiresMs);
      sessionStorage.setItem("auth_token", newToken);
      sessionStorage.setItem("user_info", JSON.stringify(newUser));
      sessionStorage.setItem("auth_expires", expires.toString());
      setIsReady(true);
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setExpires(null);
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("user_info");
    sessionStorage.removeItem("auth_expires");
    setIsReady(true);
  }, []);

  const updateUser = useCallback((newUser: UserInfo) => {
    setUser(newUser);
    sessionStorage.setItem("user_info", JSON.stringify(newUser));
  }, []);

  // Load auth state from sessionStorage on mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const hydrateAuthState = async () => {
      const storedToken = sessionStorage.getItem("auth_token");
      const storedUser = sessionStorage.getItem("user_info");
      const storedExpires = sessionStorage.getItem("auth_expires");

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
        console.error("Failed to parse stored user info", error);
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
        sessionStorage.setItem("user_info", JSON.stringify(latestUser));
      } catch (error) {
        console.error("Failed to refresh session", error);
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
