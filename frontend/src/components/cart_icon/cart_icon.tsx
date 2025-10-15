"use client";

import { CartContext } from "@/contexts/cart";
import { useCartItemsQuery } from "@/lib/queries/cart_items";
import { ShoppingCart } from "lucide-react";
import { motion } from "motion/react";
import { useContext } from "react";

export default function CartIcon() {
    const cartContext = useContext(CartContext);

    const { data } = useCartItemsQuery();

    const handleClick = () => {
        cartContext?.setVisible((curr) => {
            return !curr;
        })
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleClick}
            className="flex items-center gap-2 bg-bg-accent p-2 pl-3 pr-3 rounded-full text-fg-dark"
        >
            <ShoppingCart width={15} height={15} className="" />
            <p className="text-sm">
                {data ? data.length : 0}
            </p>
        </motion.button>
    );
}