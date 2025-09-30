import ItemSlider from "@/components/item_slider/item_slider";
import { ItemT } from "@/lib/api/models";

export default async function DashboardPage() {
    const fakeItems: ItemT[] = [
        {
            id: '1',
            name: 'Test Item #1',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '2',
            name: 'Test Item #2',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '3',
            name: 'Test Item #3',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '4',
            name: 'Test Item #4',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '5',
            name: 'Test Item #4',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '6',
            name: 'Test Item #4',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '7',
            name: 'Test Item #4',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '8',
            name: 'Test Item #4',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '9',
            name: 'Test Item #4',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        },
        {
            id: '10',
            name: 'Test Item #4',
            description: 'Test description',
            category: 'Vegetables',
            inStock: 5,
            imageUrl: ''
        }
    ]

    return (
        <div className="">
            <ItemSlider title="Vegetables" items={fakeItems} />
            <ItemSlider title="Fruits" items={fakeItems} />
            <ItemSlider title="Meat" items={fakeItems} />
        </div>
    )
}