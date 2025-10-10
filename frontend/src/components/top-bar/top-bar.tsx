// components/TopBar.tsx
import SearchBar from "@/components/search_bar/search_bar";
import AddressSelector from "@/components/address_selector/address_selector";
import AccountButton from "@/components/account_button/account_button";
import ThemeToggle from "@/components/theme_toggle/theme_toggle";
import CartIcon from "@/components/cart_icon/cart_icon";
import Link from "next/link";

export default function TopBar() {
  return (
      <div className="grid grid-cols-[auto_1fr] md:grid-cols-[200px_1fr] border-bg-dark border-b bg-bg-light">
        {/* Left Section: Logo */}
        <div className="pl-5 pr-5 flex items-center">
        
        <Link href="/home/dashboard" passHref>
            <img
              src="/logo.png"
              alt="OFS Logo"
              className="h-18 w-auto cursor-pointer"
            />
          </Link>
        </div>

        {/* Right Section: Functional Components */}
        <div className="pr-5 flex items-center gap-4">
          <SearchBar />
          <AddressSelector />
          <AccountButton />
          <ThemeToggle />
          <CartIcon />
        </div>
      </div>
  );
}
