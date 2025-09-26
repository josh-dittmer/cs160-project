import { Search } from "lucide-react";

export default function SearchBar() {
    return (
        <div className="grow">
            <div className="flex items-center gap-3 bg-bg-medium p-2 rounded-full">
                <Search width={20} height={20} className="text-fg-medium" />
                <input
                    type="text"
                    placeholder="Search..."
                    className="w-full text-fg-dark outline-none"
                />
            </div>
        </div>
    )
}