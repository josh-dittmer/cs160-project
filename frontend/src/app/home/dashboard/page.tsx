import ItemSlider from "@/components/item_slider/item_slider";
import { ItemsByCategoryResponse } from "@/lib/api/models";
import { get, request } from "@/lib/api/request";

export default async function DashboardPage() {
    // Request items grouped by category from flexible backend endpoint
    const itemsByCategory = await request('/api/items?group_by=category', get({
        decoder: ItemsByCategoryResponse
    }));

    return (
        <div className="">
            {itemsByCategory.fruits && itemsByCategory.fruits.length > 0 && (
                <ItemSlider title="Fruits" items={itemsByCategory.fruits} />
            )}
            {itemsByCategory.vegetables && itemsByCategory.vegetables.length > 0 && (
                <ItemSlider title="Vegetables" items={itemsByCategory.vegetables} />
            )}
            {itemsByCategory.meat && itemsByCategory.meat.length > 0 && (
                <ItemSlider title="Meat" items={itemsByCategory.meat} />
            )}
            {itemsByCategory.dairy && itemsByCategory.dairy.length > 0 && (
                <ItemSlider title="Dairy" items={itemsByCategory.dairy} />
            )}
        </div>
    )
}