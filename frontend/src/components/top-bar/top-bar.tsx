// components/TopBar.tsx
import AddressSelector from "@/components/address_selector/address_selector";
import CartIcon from "@/components/cart_icon/cart_icon";
import SearchBar from "@/components/search_bar/search_bar";
import ThemeToggle from "@/components/theme_toggle/theme_toggle";
import Link from "next/link";
import CartPreview from "../cart_preview/cart_preview";

export default function TopBar() {
    return (
        <div className="relative grid grid-cols-[auto_1fr] md:grid-cols-[200px_1fr] border-bg-dark border-b bg-bg-light">
            {/* Left Section: Logo */}
            <div className="pl-5 pr-5 flex items-center">

                <Link href="/home/dashboard" passHref>
                    <img
                        src="/logo.png"
                        alt="OFS Logo"
                        className="h-12 w-auto cursor-pointer"
                    />
                </Link>
            </div>

            {/* Right Section: Functional Components */}
            <div className="pr-5 flex items-center gap-4">
                <SearchBar />
                <AddressSelector />
                <ThemeToggle />
                <CartIcon />
            </div>
            <div className="absolute right-0 bottom-0 transform-[translateY(100%)] h-[calc(100svh-90px)] w-[calc(100svw-74px)] sm:w-[400px] z-8 pointer-events-none">
                <CartPreview />
            </div>
        </div>
    );
}
