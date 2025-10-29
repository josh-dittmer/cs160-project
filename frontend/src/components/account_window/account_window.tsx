"use client";

import { useAuth } from "@/contexts/auth";
import { UserWindowContext } from "@/contexts/user_window";
import { DollarSign, LogOut, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useContext } from "react";

export default function AccountWindow() {
    const userWindowContext = useContext(UserWindowContext);

    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/home/dashboard");
    };

    if (!user || !isAuthenticated) return;

    return (
        <AnimatePresence>
            {userWindowContext?.visible && (
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex flex-col gap-2 ml-2 min-w-64 p-5 bg-bg-light shadow-xl/30 rounded-xl pointer-events-auto">
                    <div className="border-b border-bg-dark">
                        <h1 className="text-fg-dark text-xl font-bold p-1">My Account</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {user.profile_picture ? (
                            <img 
                                src={user.profile_picture} 
                                alt="Profile" 
                                className="rounded-full w-15 h-15 object-cover"
                            />
                        ) : (
                            <div className="rounded-full bg-gradient-to-br from-purple-500 to-purple-700 w-15 h-15 flex items-center justify-center">
                                <p className="text-white font-bold text-lg">
                                    {user?.full_name ? (
                                        user.full_name.trim().split(/\s+/).length > 1 
                                            ? user.full_name.trim().split(/\s+/)[0][0] + user.full_name.trim().split(/\s+/).slice(-1)[0][0]
                                            : user.full_name.at(0)
                                    ) : "?"}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-fg-dark">{user?.full_name}</p>
                        </div>
                    </div>
                    <div className="border-b border-bg-dark">
                        <h1 className="text-fg-dark text-xl font-bold p-1">Settings</h1>
                    </div>
                    <div className="flex-col">
                        <div className="border-b border-bg-dark pb-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => {
                                    router.push('/profile');
                                    userWindowContext?.setVisible(false);
                                }}
                                className="flex items-center gap-2 p-2 hover:bg-bg-dark rounded-xl w-full"
                            >
                                <Settings className="text-fg-dark" width={20} height={20} />
                                <p className="text-fg-dark">Edit profile</p>
                            </motion.button>
                        </div>
                        <div className="border-b border-bg-dark pt-2 pb-2">
                            <motion.a
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.99 }}
                                className="flex items-center gap-2 p-2 hover:bg-bg-dark rounded-xl"
                            >
                                <DollarSign className="text-fg-dark" width={20} height={20} />
                                <p className="text-fg-dark">Payment settings</p>
                            </motion.a>
                        </div>
                        <div className="border-b border-bg-dark pt-2 pb-2">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={handleLogout}
                                className="flex items-center gap-2 p-2 hover:bg-bg-dark rounded-xl w-full"
                            >
                                <LogOut className="text-fg-dark" width={20} height={20} />
                                <p className="text-fg-dark">Sign out</p>
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}