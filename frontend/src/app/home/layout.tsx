"use client";

import AccountWindow from "@/components/account_window/account_window";
import PaymentWindow from "@/components/payment_window/payment_window";
import Sidebar from "@/components/sidebar/sidebar";
import TopBar from "@/components/top-bar/top-bar";
import { useAuth } from "@/contexts/auth";
import Link from "next/link";
import { ReactNode } from "react";

export default function HomeLayout({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const isManager = user?.role === 'manager';
    const isEmployee = user?.role === 'employee';
    const showBanner = isAdmin || isManager || isEmployee;

    // Determine which dashboard to link to
    const getDashboardLink = () => {
        if (isAdmin) return "/admin/dashboard";
        if (isManager) return "/manager/dashboard";
        if (isEmployee) return "/employee/dashboard";
        return "/home/dashboard";
    };

    // Determine view name for button text
    const getViewName = () => {
        if (isAdmin) return 'Admin';
        if (isManager) return 'Manager';
        if (isEmployee) return 'Employee';
        return 'Customer';
    };

    return (
        <div className={`w-svw h-svh grid ${showBanner ? 'grid-rows-[40px_60px_auto_30px]' : 'grid-rows-[60px_auto_30px]'}`}>
            {/* Admin/Manager/Employee Customer View Banner */}
            {showBanner && (
                <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between shadow-md">
                    <span className="text-sm font-medium">
                        You are viewing the site as a customer
                    </span>
                    <Link
                        href={getDashboardLink()}
                        className="px-3 py-1 bg-white text-green-600 hover:bg-gray-100 rounded font-medium text-sm transition-colors"
                    >
                        Switch to {getViewName()} view
                    </Link>
                </div>
            )}
            <TopBar />
            <div className="grid grid-cols-[75px_auto] md:grid-cols-[200px_auto] overflow-hidden">
                <div className="relative border-bg-dark border-r bg-bg-light p-3">
                    <Sidebar />
                    <div className="absolute bottom-0 right-0 transform-[translateX(100%)] mb-3 z-10 pointer-events-none">
                        <AccountWindow />
                    </div>
                </div>
                <div className="p-5 overflow-y-scroll">{children}</div>
            </div>
            <div className="flex items-center border-bg-dark border-t bg-bg-light pl-5">
                <p className="text-fg-medium text-xs">CS 160 Project</p>
            </div>
            <PaymentWindow />
        </div>
    );
}