import TopBar from "@/components/top-bar/top-bar";
import { ReactNode } from "react";

export default function PaymentLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <TopBar />
            {children}
        </>
    )
}
