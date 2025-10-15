'use client';
import {useEffect, useMemo, useState} from "react";
import { fetchProducts } from "@/lib/api/products";
import type { Product, Status } from "@/lib/api/tableTypes";
import { CardTable } from "@/components/employee_table/card_table";
import { StatusBadge } from "@/components/employee_table/status_badge";
import { Icons } from "@/components/employee_table/icons";
import "./inventory.css";

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
        <div className="inventory-page">
            <h1 className="page-title">Query Inventory</h1>

            <div className="filters-row">
                <div className="search-wrap">
                    <Icons.Search className="search-icon" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search Products"
                        className="search-input" />
                </div>

                <div className="select-wrap">
                    <select value= {category} onChange={e => setCategory(e.target.value)}
                        className = "select">
                        {categories.map(c => <option key={c}>{c}</option>)}       
                    </select>
                </div>

                <div className="select-wrap">
                    <select value={status} onChange={e => setStatus(e.target.value as any)}
                        className = "select">
                        {["All", "In Stock", "Out of Stock", "Low Stock"].map(s =>
                            <option key={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <CardTable>
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th style={ {textAlign: "right"}} />
                    </tr>
                </thead>
                <tbody>
                    {filteredProducts.map(p => (
                        <tr key={p.id}>
                            <td>
                                <div className="product-cell">
                                    <div className="product-thumb">
                                        <Icons.Package2 className ="thumb-icon" />
                                    </div>
                                    <span className ="product-name">{p.name}</span>
                                </div>
                            </td>
                            <td className="muted">{p.id}</td>
                            <td className="muted">{p.name}</td>
                            <td><span className="qty-pill">{p.quantity}</span></td>
                            <td><StatusBadge status={p.status} /></td>
                            <td style= {{textAlign: "right"}}>
                                <button className="kebab-btn" aria-label="more">
                                    <Icons.MoreVertical className="kebab-icon" />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredProducts.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: "32", color: "#71717a"}}>
                                No products found. Try adjusting your search or filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </CardTable>
        </div>
    );
}

