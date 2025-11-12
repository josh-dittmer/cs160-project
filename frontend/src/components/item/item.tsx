'use client';

import { ItemT } from "@/lib/api/models";
import { motion } from "motion/react";
import { Image, Plus, Star } from "lucide-react";
import { useUpsertCartItemMutation } from "@/lib/mutations/cart_item/upsert";
import { useEffect, useState } from "react";

export default function ItemCard({ item }: { item: ItemT }) {
  const { mutate } = useUpsertCartItemMutation();
  const [isFavorite, setIsFavorite] = useState(false);

  // Load initial favorite status from localStorage
  useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    setIsFavorite(savedFavorites.some((f: ItemT) => f.id === item.id));
  }, [item.id]);

  // TODO: This is not a fully implement for favorites, because the data is
  //        not stored in sqlite. Please modify and fetch to backend
  // Toggle favorite status
  const toggleFavorite = () => {
    const savedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    let updatedFavorites;

    if (isFavorite) {
      // remove item
      updatedFavorites = savedFavorites.filter((f: ItemT) => f.id !== item.id);
    } else {
      // add item
      updatedFavorites = [...savedFavorites, item];
    }

    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
    setIsFavorite(!isFavorite);
  };

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

          {/* Favorite + Add buttons */}
          <div className="absolute bottom-0 right-0 flex flex-col items-end p-4 gap-2 opacity-0 group-hover:opacity-100">
            {/* Favorite button */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.99 }}
              onClick={toggleFavorite}
              className={`p-1 rounded-full transition ${
                isFavorite ? "bg-yellow-400" : "bg-bg-light hover:bg-bg-medium"
              }`}
            >
              <Star
                className={`${isFavorite ? "text-white" : "text-fg-dark"}`}
                width={22}
                height={22}
              />
            </motion.button>

            {/* Add button */}
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

        {/* Item info */}
        <div className="flex items-center p-1">
          <h1 className="text-md text-fg-dark grow">{item.name}</h1>
          <p className="text-fg-medium text-sm">
            <span className="font-bold">${(item.price_cents / 100).toFixed(2)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
