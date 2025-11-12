"use client";

import { useEffect, useState } from "react";
import ItemCard from "@/components/item/item";
import { ItemT } from "@/lib/api/models";

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<ItemT[]>([]);

  // Load favorites from localStorage
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
    setFavorites(saved);
  }, []);

  return (
    <main className="space-y-6">
        <div className="border-b border-bg-dark">
            <h1 className="text-fg-dark font-bold text-lg">Favorites</h1>
        </div>

      {favorites.length === 0 ? (
        <p className="text-gray-500">You haven’t added any favorites yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
