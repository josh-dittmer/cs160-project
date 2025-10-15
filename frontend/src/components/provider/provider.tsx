'use client';

import { AuthProvider } from "@/contexts/auth";
import { CartProvider } from "@/contexts/cart";
import { ThemeProvider } from "@/contexts/theme";
import { UserWindowProvider } from "@/contexts/user_window";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export default function Provider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme='light'>
                <AuthProvider>
                    <UserWindowProvider>
                        <CartProvider>
                            {children}
                        </CartProvider>
                    </UserWindowProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    )
}