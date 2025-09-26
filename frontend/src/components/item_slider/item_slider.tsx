'use client';

import { ItemT } from "@/lib/api/models";
import { ChevronLeft, ChevronRight, Image } from "lucide-react";

function Item({ item }: { item: ItemT }) {
    return (
        <div className="m-2">
            <div className="flex flex-col justify-center items-center">
                <div className="max-w-64 w-full">
                    <div className="flex items-center justify-center bg-bg-medium w-full min-h-36 rounded-xl">
                        <Image width={30} height={30} className="text-fg-dark" />
                    </div>
                    <div className="flex items-center p-1">
                        <h1 className="text-md text-fg-dark grow">{item.name}</h1>
                        <p className="hidden lg:block text-fg-medium text-sm">{item.inStock} in stock</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function ItemSlider({ title, items }: { title: string, items: ItemT[] }) {
    // display 3 items at a time
    const currItems: ItemT[] = items.slice(0, 3);

    return (
        <div className="w-full">
            <div className="p-2 border-fg-light border-b">
                <h1 className="text-2xl text-fg-dark">{title}</h1>
            </div>
            <div className="grid grid-cols-[0.2fr_1fr_1fr_1fr_0.2fr] p-2">
                <div className="flex justify-center items-center">
                    <ChevronLeft width={20} height={20} className="text-fg-dark" />
                </div>
                {currItems.map((item) => {
                    return <Item key={item.id} item={item} />
                })}
                <div className="flex justify-center items-center">
                    <button>
                        <ChevronRight width={20} height={20} className="text-fg-dark" />
                    </button>
                </div>
            </div>
        </div>
    )
}