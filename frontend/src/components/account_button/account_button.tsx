"use client";

import { useAuth } from "@/contexts/auth";
import { User, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AccountButton() {
    const { user, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleLogout = () => {
        logout();
        setShowDropdown(false);
        router.push("/home/dashboard");
    };

    if (!isAuthenticated) {
        return (
            <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-bg-medium hover:bg-bg-dark transition-colors"
            >
                <User size={20} className="text-fg-medium" />
                <div className="flex flex-col items-start">
                    <span className="text-xs text-fg-medium">Hello, sign in</span>
                    <span className="text-sm font-semibold text-fg-dark">Account</span>
                </div>
            </Link>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-bg-medium hover:bg-bg-dark transition-colors"
            >
                <User size={20} className="text-fg-medium" />
                <div className="flex flex-col items-start">
                    <span className="text-xs text-fg-medium">Hello, {user?.full_name || user?.email}</span>
                    <span className="text-sm font-semibold text-fg-dark">Account</span>
                </div>
            </button>

            {showDropdown && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-bg-light border border-bg-dark rounded-md shadow-lg z-20">
                        <div className="py-2">
                            <Link
                                href="/home/dashboard"
                                className="block px-4 py-2 text-sm text-fg-dark hover:bg-bg-medium transition-colors"
                                onClick={() => setShowDropdown(false)}
                            >
                                Your Account
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-fg-dark hover:bg-bg-medium transition-colors flex items-center gap-2"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

