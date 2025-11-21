'use client';

import { AddressProvider } from "@/contexts/address";
import { AuthProvider } from "@/contexts/auth";
import { CartProvider } from "@/contexts/cart";
import { MapsProvider } from "@/contexts/maps";
import { PaymentWindowProvider } from "@/contexts/payment_window";
import { ThemeProvider } from "@/contexts/theme";
import { UserWindowProvider } from "@/contexts/user_window";
import { WebsocketProvider } from "@/contexts/websocket";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { ReactNode, useState } from "react";

export default function Provider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme='light'>
                <AuthProvider>
                    <UserWindowProvider>
                        <PaymentWindowProvider>
                            <CartProvider>
                                <AddressProvider>
                                    <MapsProvider>
                                        <WebsocketProvider>
                                            <Toaster position="top-right" />
                                            {children}
                                        </WebsocketProvider>
                                    </MapsProvider>
                                </AddressProvider>
                            </CartProvider>
                        </PaymentWindowProvider>
                    </UserWindowProvider>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    )
}