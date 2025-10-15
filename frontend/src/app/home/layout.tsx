import AccountWindow from "@/components/account_window/account_window";
import Sidebar from "@/components/sidebar/sidebar";
import TopBar from "@/components/top-bar/top-bar";
import { ReactNode } from "react";

export default async function HomeLayout({ children }: { children: ReactNode }) {
    return (
        <div className="w-svw h-svh grid grid-rows-[60px_auto_30px]">
            <TopBar></TopBar>
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
        </div>
    );
}