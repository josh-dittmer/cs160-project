'use client';

import { ItemT } from "@/lib/api/models";
import { motion } from "motion/react";
import { Image, Plus } from "lucide-react";
import { useUpsertCartItemMutation } from "@/lib/mutations/cart_item/upsert";

export default function ItemCard({ item }: { item: ItemT }) {
  const { mutate } = useUpsertCartItemMutation();

  const visitItemPage = () => {
    window.location.href = `/home/item/${item.id}`;
  };

  const addToCart = (id: number) => {
    mutate({ item_id: id, quantity: 1 });
  };

  return (
    <div className="flex justify-center group">
      <div className="m-2 w-72 text-left">
        <div className="relative flex items-center justify-center bg-white min-h-36 rounded-xl overflow-hidden border border-gray-200">
          <button onClick={visitItemPage} className="w-full cursor-pointer">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-36 object-contain"
              />
            ) : (
              <Image width={30} height={30} className="text-fg-dark" />
            )}
          </button>
          <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => addToCart(item.id)}
              className="bg-bg-light hover:bg-bg-medium p-1 rounded-full"
            >
              <Plus className="text-fg-dark" width={25} height={25} />
            </motion.button>
          </div>
        </div>
        <div className="flex items-center p-1">
          <h1 className="text-md text-fg-dark grow">{item.name}</h1>
          <p className="text-fg-medium text-sm">
            <span className="font-bold">
              ${(item.price_cents / 100).toFixed(2)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
