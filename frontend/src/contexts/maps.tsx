import { useLoadScript } from "@react-google-maps/api";
import { createContext, ReactNode } from "react";

export type MapsContextType = {
    loaded: boolean,
};

export const MapsContext = createContext<MapsContextType | null>(null);

export function MapsProvider({ children }: { children: ReactNode }) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: ['places', 'geometry', 'core', 'maps'],
        id: 'google-maps-script',
    })

    console.log(isLoaded);

    return (
        <MapsContext.Provider value={{ loaded: isLoaded }}>
            {children}
        </MapsContext.Provider>
    )
}