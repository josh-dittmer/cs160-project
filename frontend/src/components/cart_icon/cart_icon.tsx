"use client";

import { useAuth } from "@/contexts/auth";
import { CartContext } from "@/contexts/cart";
import { useCartItemsQuery } from "@/lib/queries/cart_items";
import { ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useContext } from "react";
import { usePathname} from "next/navigation";

export default function CartIcon() {
    const cartContext = useContext(CartContext);

    const router = useRouter();
    const pathname = usePathname();

    const { isAuthenticated } = useAuth();
    const { data } = useCartItemsQuery();

    const handleClick = () => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }
        // If the user is already on the payment page, refresh it
        if (pathname === "/payment") {
            // TODO: change the UI of alert later
            alert("Please continue to checkout. Shopping cart is not available right now.");
            router.refresh();
            return;
        }

        // Toggle the cart drawer
        cartContext?.setVisible((curr) => !curr);
    };

    return (
        <motion.button
            layout
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleClick}
            className="flex items-center gap-2 bg-bg-accent p-2 pl-3 pr-3 rounded-full text-fg-dark min-h-[36px]"
        >
            <ShoppingCart width={15} height={15} className="" />
            <p className="text-sm">
                {data ? data.length : ''}
            </p>
        </motion.button>
    );
}