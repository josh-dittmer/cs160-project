import AddressSelector from "@/components/address_selector/address_selector";
import CartIcon from "@/components/cart_icon/cart_icon";
import SearchBar from "@/components/search_bar/search_bar";
import Sidebar from "@/components/sidebar/sidebar";
import ThemeToggle from "@/components/theme_toggle/theme_toggle";
import { ReactNode } from "react";

export default async function HomeLayout({ children }: { children: ReactNode }) {
    return (
        <div className="w-svw h-svh grid grid-rows-[60px_auto_30px]">
            <div className="grid grid-cols-[auto_1fr] md:grid-cols-[200px_1fr] border-bg-dark border-b bg-bg-light">
                <div className="pl-5 pr-5 flex items-center">
                    <h1 className="text-fg-dark text-3xl font-bold grow">Logo</h1>
                </div>
                <div className="pr-5 flex items-center gap-4">
                    <SearchBar />
                    <AddressSelector />
                    <ThemeToggle />
                    <CartIcon />
                </div>
            </div>
            <div className="grid grid-cols-[75px_auto] md:grid-cols-[200px_auto] overflow-hidden">
                <div className="border-bg-dark border-r bg-bg-light p-3">
                    <Sidebar />
                </div>
                <div className="p-5 overflow-y-scroll">{children}</div>
            </div>
            <div className="flex items-center border-bg-dark border-t bg-bg-light pl-5">
                <p className="text-fg-medium text-xs">CS 160 Project</p>
            </div>
        </div>
    );
}