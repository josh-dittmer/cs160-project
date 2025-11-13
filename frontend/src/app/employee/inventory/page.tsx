'use client';
import {useEffect, useMemo, useState} from "react";
import { fetchProducts } from "@/lib/api/products";
import type { Product, Status } from "@/lib/api/tableTypes";
import { CardTable } from "@/components/employee_table/card_table";
import { StatusBadge } from "@/components/employee_table/status_badge";
import { Icons } from "@/components/employee_table/icons";

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("All");
    const [status, setStatus] = useState<("All") | Status>("All");
    
    useEffect(() => {
        fetchProducts().then(setProducts);
    }, []);

    const categories = useMemo(
        () => ["All", ...Array.from(new Set(products.map((p) => p.category)))],
        [products]
    );
    
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
        const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.id.includes(query);
        const matchesCategory = category === "All" || p.category === category;
        const matchesStatus = status === "All" || p.status === status;
        return matchesQuery && matchesCategory && matchesStatus;
        });
    }, [products, query, category, status]);

    return (
        <div className="p-8">
            <h1 className="mb-6 text-5xl font-semibold tracking-tight">Query Inventory</h1>

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="relative">
                    <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search Products"
                        className="h-10 w-[240px] rounded-xl border border-zinc-200 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300" />
                </div>

                <select value= {category} onChange={e => setCategory(e.target.value)}
                    className = "h-10 w-[180px] rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-300">
                    {categories.map(c => <option key={c}>{c}</option>)}       
                </select>

                <select value={status} onChange={e => setStatus(e.target.value as any)}
                    className = "h-10 w-[160px] rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-300">
                   {["All", "In Stock", "Out of Stock", "Low Stock"].map(s =>
                        <option key={s}>{s}</option>)}
                </select>
            </div>

            <CardTable>
                <thead className="bg-zinc-50 text-zinc-600 text-left">
                    <tr>
                        <th className="px-6 py-4 w-[25%] font-medium">Product</th>
                        <th className="px-6 py-4 w-[15%] font-medium text-center">ID</th>
                        <th className="px-6 py-4 w-[25%] font-medium">Name</th>
                        <th className="px-6 py-4 w-[15%] font-medium text-center">Quantity</th>
                        <th className="px-6 py-4 w-[20%] font-medium text-center">Status</th>
                        <th className="px-6 py-4" />
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {filteredProducts.map(p => (
                        <tr key={p.id}  className="hover:bg-zinc-50/60">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100 shrink-0">
                                        <Icons.Package2 className ="h-5 w-5 text-zinc-500" />
                                    </div>
                                    <span className ="font-medium text-zinc-900">{p.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center text-zinc-600">{p.id}</td>
                            <td className="px-6 py-4 text-zinc-600">{p.name}</td>

                            <td className="px-6 py-4 text-center">
                                <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700">
                                    {p.quantity}
                                </span>
                            </td>

                            <td className="px-6 py-4 text-center">
                                <StatusBadge status={p.status} />
                            </td>
                        </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                                No products found. Try adjusting your search or filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </CardTable>
        </div>
    );
}

