'use client';

//import ItemSlider from "@/components/item_slider/item_slider";
import ItemSlider from '@/components/item_slider/item_slider.client';
import { useItemsQuery } from '@/lib/queries/items';

export default function DashboardPage() {
    // Request items grouped by category from flexible backend endpoint
    const { data, isLoading } = useItemsQuery();

    if (!data || isLoading) return;

    return (
        <div className="">
            {data.fruits && data.fruits.length > 0 && (
                <ItemSlider title="Fruits" items={data.fruits} />
            )}
            {data.vegetables && data.vegetables.length > 0 && (
                <ItemSlider title="Vegetables" items={data.vegetables} />
            )}
            {data.meat && data.meat.length > 0 && (
                <ItemSlider title="Meat" items={data.meat} />
            )}
            {data.dairy && data.dairy.length > 0 && (
                <ItemSlider title="Dairy" items={data.dairy} />
            )}
            {data.grains && data.grains.length > 0 && (
                <ItemSlider title="Grains" items={data.grains} />
            )}
        </div>
    )
}