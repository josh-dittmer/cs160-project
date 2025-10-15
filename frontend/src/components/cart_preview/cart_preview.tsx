"use client";

import { CartContext } from "@/contexts/cart";
import { CartItemT } from "@/lib/api/models";
import { useCartItemsQuery } from "@/lib/queries/cart_items";
import { ImageDown, Plus, Trash, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useContext } from "react";

function CartPreviewItem({ cartItem }: { cartItem: CartItemT }) {
    return (
        <div className="flex items-center gap-3 pb-4">
            <div className="">
                {cartItem.item.image_url && (
                    <Image
                        src={cartItem.item.image_url}
                        width={100}
                        height={100}
                        alt={cartItem.item.name}
                        className="object-cover w-15 h-15 rounded-xl"
                    />
                )}
                {!cartItem.item.image_url && (
                    <ImageDown width={50} height={50} />
                )}
            </div>
            <div>
                <p className="text-fg-dark text-md max-w-32 truncate">{cartItem.item.name}</p>
                <p className="text-fg-medium text-sm">${cartItem.item.price_cents / 100}</p>
            </div>
            <div className="grow flex items-center justify-end">
                <div className="bg-bg-medium grid grid-cols-[1fr_1fr_1fr] w-25 rounded-full shadow-xl/20">
                    <button className="bg-bg-light hover:bg-bg-dark p-2 rounded-full flex justify-center items-center">
                        <Trash className="text-fg-dark" width={20} height={20} />
                    </button>
                    <p className="text-fg-dark flex justify-center items-center text-xs font-bold">{cartItem.quantity}x</p>
                    <button className="bg-bg-light hover:bg-bg-dark p-2 rounded-full flex justify-center items-center">
                        <Plus className="text-fg-dark" width={20} height={20} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function CartPreview() {
    const cartContext = useContext(CartContext);
    const router = useRouter();

    const { data, isPending } = useCartItemsQuery();

    const closeCart = () => {
        cartContext?.setVisible((curr) => {
            return !curr;
        })
    };

    const checkout = () => {
        router.push("/home/checkout");
    };

    return (
        <AnimatePresence>
            {cartContext?.visible && (
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{
                        x: {
                            type: 'spring',
                            bounce: 0,
                            duration: 0.25
                        }
                    }}
                    className="grid grid-rows-[50px_1fr_50px] h-full bg-bg-light mt-[1px] border-l border-bg-dark p-5 pointer-events-auto">
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={closeCart}
                            className="p-2 rounded-xl hover:bg-bg-dark"
                        >
                            <X className="text-fg-dark" width={25} height={25} />
                        </motion.button>
                        <h1 className="text-fg-dark text-2xl">Cart</h1>
                    </div>
                    <div className="mt-3 overflow-y-scroll">
                        {isPending && (
                            <p>Loading...</p>
                        )}
                        {!isPending && (
                            data?.map((cartItem) =>
                                <CartPreviewItem key={cartItem.item.id} cartItem={cartItem} />
                            )
                        )}
                    </div>
                    <div className="flex items-center justify-center">
                        <motion.button
                            whileTap={{ scale: 0.99 }}
                            className="bg-bg-dark hover:bg-bg-accent p-3 rounded-xl w-full"
                        >
                            <p className="text-fg-dark">Continue</p>
                        </motion.button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}