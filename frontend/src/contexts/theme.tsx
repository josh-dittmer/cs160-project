import { createContext, Dispatch, ReactNode, SetStateAction, useState } from "react";

export type ThemeName = 'dark' | 'light';

export type Theme = {
    name: ThemeName
}

type ThemeContextType = {
    theme: Theme,
    setTheme: Dispatch<SetStateAction<Theme>>
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children, defaultTheme }: { children: ReactNode, defaultTheme: ThemeName }) {
    const [theme, setTheme] = useState<Theme>({
        name: defaultTheme
    });

    return (
        <ThemeContext.Provider value={{ theme: theme, setTheme: setTheme }}>
            <div className={`${theme.name}`}>
                {children}
            </div>
        </ThemeContext.Provider>
    )
}