"use client";

import { ItemDetailT } from "@/lib/api/models";
import { useUpsertCartItemMutation } from "@/lib/mutations/cart_item/upsert";
import { motion } from "motion/react";

export default function AddToCartButton({ item }: { item: ItemDetailT }) {
    const { mutate } = useUpsertCartItemMutation();


    const addToCart = () => {
        mutate({
            item_id: item.id,
            quantity: 1
        });
    };

    return (<motion.button
        whileTap={{ scale: 0.99 }}
        disabled={item.stock_qty === 0}
        className={`w-full py-3 px-6 rounded-lg font-semibold text-fg-dark ${item.stock_qty > 0
            ? 'bg-bg-dark hover:bg-bg-accent active:bg-bg-accent'
            : 'bg-bg-dark cursor-not-allowed'
            }`}
        onClick={addToCart}
    >
        {item.stock_qty > 0 ? 'Add to Cart' : 'Out of Stock'}
    </motion.button>)
}