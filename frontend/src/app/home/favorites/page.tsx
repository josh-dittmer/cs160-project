"use client";

import { useEffect, useState } from "react";
import ItemCard from "@/components/item/item";
import { ItemT } from "@/lib/api/models";
import { useAuth } from "@/contexts/auth";
import { getFavorites, FavoriteItem } from "@/lib/api/favorites";

export default function FavoritesPage() {
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load favorites from backend
  const fetchFavorites = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getFavorites(token);
      setFavorites(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [token]);

  // Callback to refresh favorites list when an item is unfavorited
  const handleFavoriteToggle = () => {
    fetchFavorites();
  };

  return (
    <main className="space-y-6">
      <div className="border-b border-bg-dark">
        <h1 className="text-fg-dark font-bold text-lg">Favorites</h1>
      </div>

      {!token ? (
        <p className="text-gray-500">Please log in to view your favorites.</p>
      ) : isLoading ? (
        <p className="text-gray-500">Loading favorites...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : favorites.length === 0 ? (
        <p className="text-gray-500">You haven't added any favorites yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {favorites.map((item) => (
            <ItemCard key={item.id} item={item} onFavoriteToggle={handleFavoriteToggle} />
          ))}
        </div>
      )}
    </main>
  );
}
