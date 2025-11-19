'use client';

//import ItemSlider from "@/components/item_slider/item_slider";
import ItemSlider from '@/components/item_slider/item_slider.client';
import { useItemsQuery } from '@/lib/queries/items';
import { toTitleCase } from '@/lib/util/categoryHelpers';

export default function DashboardPage() {
    // Request items grouped by category from flexible backend endpoint
    const { data, isLoading } = useItemsQuery();

    if (!data || isLoading) return;

    return (
        <div className="">
            {data && Object.entries(data).map(([categoryKey, items]) => {
                if (!items || items.length === 0) return null;
                
                return (
                    <ItemSlider 
                        key={categoryKey}
                        title={toTitleCase(categoryKey)} 
                        items={items} 
                    />
                );
            })}
        </div>
    )
}