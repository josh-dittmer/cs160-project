import { ChevronDown, MapPin } from "lucide-react";

export default function AddressSelector() {
    return (
        <div>
            <div className="flex items-center gap-3 bg-bg-medium p-2 rounded-full">
                <MapPin width={20} height={20} className="text-fg-medium" />
                <p className="text-fg-medium hidden md:block text-nowrap">1234 Address St.</p>
                <ChevronDown width={20} height={20} className="text-fg-medium" />

            </div>
        </div>
    );
}