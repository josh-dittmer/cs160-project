'use client';

import { createContext, Dispatch, SetStateAction, useState } from "react";
import { useAuth } from "./auth";

interface AddressContextType {
    windowVisible: boolean,
    setWindowVisible: Dispatch<SetStateAction<boolean>>,
}

export const AddressContext = createContext<AddressContextType | null>(null);

export function AddressProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();

    const [windowVisible, setWindowVisible] = useState(false);

    return (
        <AddressContext.Provider value={{ windowVisible, setWindowVisible }}>
            {children}
        </AddressContext.Provider>
    )
}