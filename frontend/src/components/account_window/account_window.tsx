"use client";

import { useAuth } from "@/contexts/auth";
import { PaymentWindowContext } from "@/contexts/payment_window";
import { UserWindowContext } from "@/contexts/user_window";
import { DollarSign, LogOut, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import ProfilePicture from "../profile_picture/profile_picture";

export default function AccountWindow() {
    const userWindowContext = useContext(UserWindowContext);
    const paymentWindowContext = useContext(PaymentWindowContext);

    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();

    const openPaymentWindow = () => {
        paymentWindowContext?.setVisible(true);
        userWindowContext?.setVisible(false);
    }

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
                        <ProfilePicture user={user} />
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
                                onClick={openPaymentWindow}
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