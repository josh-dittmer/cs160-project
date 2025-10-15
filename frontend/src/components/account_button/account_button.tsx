"use client";

import { useAuth } from "@/contexts/auth";
import { UserWindowContext } from "@/contexts/user_window";
import { UserCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useContext } from "react";

export default function AccountButton() {
    const userWindowContext = useContext(UserWindowContext);

    const { isAuthenticated } = useAuth();
    const router = useRouter();

    const handleClick = () => {
        if (isAuthenticated) {
            userWindowContext?.setVisible((curr) => {
                return !curr;
            })
        } else {
            router.push("/login");
        }
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            className={`flex items-center text-lg gap-2 text-fg-dark hover:bg-bg-dark p-2 rounded-xl cursor-pointer`}
            onClick={handleClick}
        >
            <UserCircle2 width={20} height={20} className="" />
            <p className="hidden md:block">
                {isAuthenticated ? 'My Account' : 'Sign in'}
            </p>
        </motion.button>
    )
}

