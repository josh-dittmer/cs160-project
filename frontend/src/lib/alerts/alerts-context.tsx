'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Product } from '../api/tableTypes';

type AlertState = {
    open: boolean;
    setOpen: (v: boolean) => void;
    flaggedItems: Product[];
    setFlaggedItems: (items: Product[]) => void;
    openWith: (items: Product[]) => void;
};

const AlertCtx = createContext<AlertState | null>(null);

export function AlertsProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [flaggedItems, setFlaggedItems] = useState<Product[]>([]);

    const value = useMemo<AlertState
        >(() => ({
            open,
            setOpen,
            flaggedItems,
            setFlaggedItems,
            openWith: (items: Product[]) => {
                setFlaggedItems(items);
                setOpen(true);
            },
        }), [open, flaggedItems]);

    return (
        <AlertCtx.Provider value={value}>
            {children}
        </AlertCtx.Provider>
    );
}

export function useAlerts() {
    const ctx = useContext(AlertCtx);
    if (!ctx) {
        throw new Error('useAlerts must be used within an AlertsProvider');
    }  
    return ctx;
}

export function getFlagged(items: Product[]){
    return items.filter(item => item.condition === 'Expired' || item.condition === 'Damaged');
}
