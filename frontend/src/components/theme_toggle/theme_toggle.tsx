'use client';

import { ThemeContext } from "@/contexts/theme";
import { Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useContext } from "react";

export default function ThemeToggle() {
    const theme = useContext(ThemeContext);

    const switchTheme = () => {
        const nextTheme = theme?.theme.name === 'dark' ? 'light' : 'dark';
        theme?.setTheme({
            name: nextTheme
        });
    };

    return (
        <motion.button
            className="bg-bg-medium p-1 rounded" onClick={switchTheme}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
        >
            {theme?.theme.name === 'light' ? (
                <Moon width={15} height={15} className="text-fg-light"></Moon>
            ) : (
                <Sun width={15} height={15} className="text-fg-light"></Sun>
            )}
        </motion.button>
    );
}