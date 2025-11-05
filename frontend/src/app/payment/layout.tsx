import TopBar from "@/components/top-bar/top-bar";
import { ReactNode } from "react";

export default function PaymentLayout({ children }: { children: ReactNode }) {
    return (
        <div className="w-svw h-svh grid grid-rows-[60px_auto]">
            <TopBar />
            {children}
        </div>
    )
}
