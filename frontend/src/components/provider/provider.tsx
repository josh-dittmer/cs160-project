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
                                            <Toaster 
                                                position="top-right"
                                                reverseOrder={false}
                                                gutter={8}
                                                containerClassName=""
                                                containerStyle={{}}
                                                toastOptions={{
                                                    duration: 4000,
                                                    style: {
                                                        background: '#fff',
                                                        color: '#1f2937',
                                                        fontSize: '16px',
                                                        padding: '16px 20px',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                                                        border: '1px solid #e5e7eb',
                                                        minWidth: '350px',
                                                        maxWidth: '500px',
                                                    },
                                                    success: {
                                                        duration: 3000,
                                                        iconTheme: {
                                                            primary: '#10b981',
                                                            secondary: '#fff',
                                                        },
                                                        style: {
                                                            background: '#f0fdf4',
                                                            color: '#065f46',
                                                            border: '2px solid #10b981',
                                                        },
                                                    },
                                                    error: {
                                                        duration: 5000,
                                                        iconTheme: {
                                                            primary: '#ef4444',
                                                            secondary: '#fff',
                                                        },
                                                        style: {
                                                            background: '#fef2f2',
                                                            color: '#991b1b',
                                                            border: '2px solid #ef4444',
                                                        },
                                                    },
                                                }}
                                            />
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