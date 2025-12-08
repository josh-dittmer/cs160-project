'use client';

import {createContext, Dispatch, ReactNode, SetStateAction, useEffect, useState } from 'react';

export type ThemeName = 'dark' | 'light';

export type Theme = {
  name: ThemeName;
};

type ThemeContextType = {
  theme: Theme;
  setTheme: Dispatch<SetStateAction<Theme>>;
};

export const ThemeContext = createContext<ThemeContextType | null>(null);

const STORAGE_KEY = 'theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeName | null;
      if (stored === 'dark' || stored === 'light') {
        return { name: stored };
      }
    }
    return { name: 'light' };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const current = theme.name;

    window.localStorage.setItem(STORAGE_KEY, current);

    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(current);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={theme.name}>{children}</div>
    </ThemeContext.Provider>
  );
}
