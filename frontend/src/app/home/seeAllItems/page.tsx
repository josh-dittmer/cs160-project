"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ItemsByCategoryResponse } from "@/lib/api/models";
import { get, request } from "@/lib/api/request";
import ItemCard from "@/components/item/item";
import { toTitleCase } from "@/lib/util/categoryHelpers";

export default function SeeAllItemsPage() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category")?.toLowerCase();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await request("/api/items?group_by=category", get({
          decoder: ItemsByCategoryResponse,
        }));
        if (category && res[category]) {
          setItems(res[category]);
        } else {
          setItems(Object.values(res).flat());
        }
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, [category]);

  if (loading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">
        {category
          ? `All ${toTitleCase(category)}`
          : "All Items"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
