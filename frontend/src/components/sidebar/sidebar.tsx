'use client';

import { HomeIcon, LucideProps, ReceiptText, StarIcon } from "lucide-react";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { FC } from "react";
import AccountButton from "../account_button/account_button";

export function SidebarItem({ title, href, Icon }: { title: string, href: string, Icon: FC<LucideProps> }) {
    const pathname = usePathname();

    const isSelected = pathname === href;

    return (
        <motion.a
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.99 }}
            href={href}
            className={`flex items-center text-lg gap-2 text-fg-dark ${isSelected ? 'bg-bg-dark' : ''} hover:bg-bg-dark p-2 rounded-xl`}
        >
            <Icon width={20} height={20} className="" />
            <p className="hidden md:block">{title}</p>
        </motion.a>
    )
}

export default function Sidebar() {
    return (
        <div className="flex flex-col h-full items-center md:items-start">
            <div className="flex flex-col gap-2 grow md:w-full">
                <SidebarItem title="Menu" href="/home/dashboard" Icon={HomeIcon} />
                <SidebarItem title="Favorites" href="/home/favorites" Icon={StarIcon} />
                <SidebarItem title="Orders" href="/home/orders" Icon={ReceiptText} />
            </div>
            <div className="flex flex-col gap-2 md:w-full">
                <AccountButton />
            </div>
        </div>
    )
}