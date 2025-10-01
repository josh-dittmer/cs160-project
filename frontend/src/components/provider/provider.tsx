'use client';

import { ThemeProvider } from "@/contexts/theme";
import { AuthProvider } from "@/contexts/auth";
import { ReactNode } from "react";

export default function Provider({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider defaultTheme='light'>
            <AuthProvider>
                {children}
            </AuthProvider>
        </ThemeProvider>
    )
}