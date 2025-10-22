"use client";

import { CartContext } from "@/contexts/cart";
import { CartItemT } from "@/lib/api/models";
import { useUpsertCartItemMutation } from "@/lib/mutations/cart_item/upsert";
import { useCartItemsQuery } from "@/lib/queries/cart_items";
import { Dot, ImageDown, Plus, Scale, Trash, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useContext } from "react";

function CartPreviewItem({ cartItem }: { cartItem: CartItemT }) {
    const { mutate } = useUpsertCartItemMutation();

    const increaseItemQuantity = () => {
        mutate({
            item_id: cartItem.item.id,
            quantity: cartItem.quantity + 1
        })
    };

    const decreaseItemQuantity = () => {
        mutate({
            item_id: cartItem.item.id,
            quantity: cartItem.quantity - 1
        })
    };

    return (
        <div className="flex items-center gap-3 pb-4">
            <div className="">
                {cartItem.item.image_url && (
                    cartItem.item.image_url.startsWith('data:') ? (
                        <img
                            src={cartItem.item.image_url}
                            alt={cartItem.item.name}
                            className="object-cover w-15 h-15 rounded-xl"
                        />
                    ) : (
                        <Image
                            src={cartItem.item.image_url}
                            width={100}
                            height={100}
                            alt={cartItem.item.name}
                            className="object-cover w-15 h-15 rounded-xl"
                        />
                    )
                )}
                {!cartItem.item.image_url && (
                    <ImageDown width={50} height={50} />
                )}
            </div>
            <div>
                <p className="text-fg-dark text-md max-w-32 truncate">{cartItem.item.name}</p>
                <div className="flex gap-1 items-center">
                    <p className="text-fg-medium text-sm">${(cartItem.item.price_cents / 100).toFixed(2)}</p>
                    <Dot width={15} height={15} className="text-fg-medium" />
                    <div className="flex gap-1 items-center">
                        <span className="text-fg-medium text-sm">{((cartItem.item.weight_oz * cartItem.quantity) / 16).toFixed(2)} lbs</span>
                    </div>
                </div>
            </div>
            <div className="grow flex items-center justify-end">
                <div className="bg-bg-medium grid grid-cols-[1fr_1fr_1fr] w-25 rounded-full shadow-xl/20">
                    <motion.button
                        whileTap={{ scale: 0.99 }}
                        onClick={decreaseItemQuantity}
                        className="bg-bg-light hover:bg-bg-dark p-2 rounded-full flex justify-center items-center"
                    >
                        <Trash className="text-fg-dark" width={20} height={20} />
                    </motion.button>
                    <p className="text-fg-dark flex justify-center items-center text-xs font-bold">{cartItem.quantity}x</p>
                    <motion.button
                        whileTap={{ scale: 0.99 }}
                        onClick={increaseItemQuantity}
                        className="bg-bg-light hover:bg-bg-dark p-2 rounded-full flex justify-center items-center"
                    >
                        <Plus className="text-fg-dark" width={20} height={20} />
                    </motion.button>
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

    const empty: boolean = !data || data.items.length <= 0;

    return (
        <AnimatePresence>
            {cartContext?.visible && (
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{
                        x: {
                            type: 'spring',
                            bounce: 0,
                            duration: 0.25
                        }
                    }}
                    className="grid grid-rows-[50px_1fr_90px] h-full bg-bg-light mt-[1px] border-l border-bg-dark p-5 pointer-events-auto">
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

                    <div className="mt-3 mb-3 overflow-y-scroll">
                        {isPending && (
                            <p>Loading...</p>
                        )}
                        {!isPending && (
                            data?.items.map((cartItem) =>
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    key={cartItem.item.id}
                                >
                                    <CartPreviewItem cartItem={cartItem} />
                                </motion.div>
                            )
                        )}
                    </div>
                    <div className="flex items-center justify-center">
                        {!empty && data && (
                            <div className="flex flex-col w-full gap-3">
                                {!data.shipping_waived && (
                                    <div>
                                        <p className="font-bold text-fg-dark">${(data.total_cents / 100).toFixed(2)} total</p>
                                        <div className="flex gap-1 items-center">
                                            <Scale width={15} height={15} className="text-fg-medium" />
                                            <p className="text-fg-medium text-sm">

                                                {(data.total_weight_oz / 16).toFixed(2)} lbs
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {data.shipping_waived && (
                                    <div>
                                        <p className="font-bold text-fg-dark">
                                            <span className="line-through italic text-fg-medium font-normal">${(data.total_cents / 100).toFixed(2)}</span>
                                            <span className="ml-1 text-green-700">${(data.total_item_cents / 100).toFixed(2)} total</span>
                                        </p>
                                        <div className="flex gap-1 items-center">
                                            <Scale width={15} height={15} className="text-fg-medium" />
                                            <p className="text-fg-medium text-sm">

                                                {(data.total_weight_oz / 16).toFixed(2)} lbs
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <motion.button
                                    whileTap={{ scale: 0.99 }}
                                    disabled={empty}
                                    className={`bg-bg-dark hover:bg-bg-accent p-3 rounded-xl w-full`}
                                    onClick={() => {
                                        cartContext.setVisible(false);
                                        router.push('/payment')
                                    }}
                                >
                                    <p className="text-fg-dark">Continue</p>
                                </motion.button>
                            </div>
                        )}
                        {empty && (
                            <p className="text-fg-dark">Add some items to get started!</p>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}