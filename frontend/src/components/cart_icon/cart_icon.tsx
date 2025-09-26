import { ShoppingCart } from "lucide-react";

export default async function CartIcon() {
    return (
        <div className="flex items-center gap-2 bg-bg-accent p-2 pl-3 pr-3 rounded-full text-fg-dark">
            <ShoppingCart width={15} height={15} className="" />
            <p className="text-sm">0</p>
        </div>
    );
}