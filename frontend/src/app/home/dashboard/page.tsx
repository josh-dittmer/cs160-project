import ItemSlider from "@/components/item_slider/item_slider";
import { ItemsListResponse } from "@/lib/api/models";
import { get, request } from "@/lib/api/request";

export default async function DashboardPage() {
    const items = await request('/api/items/', get({
        decoder: ItemsListResponse
    }));

    return (
        <div className="">
            <ItemSlider title="Vegetables" items={items} />
            <ItemSlider title="Fruits" items={items} />
            <ItemSlider title="Meat" items={items} />
        </div>
    )
}