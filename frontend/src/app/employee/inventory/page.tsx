'use client';
import {useEffect, useMemo, useState} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { listItems, ItemEmployee } from "@/lib/api/employee";
import { CardTable } from "@/components/employee_table/card_table";
import { StatusBadge } from "@/components/employee_table/status_badge";
import { Icons } from "@/components/employee_table/icons";
import { toTitleCase } from "@/lib/util/categoryHelpers";
import "./inventory.css";

type Status = 'In Stock' | 'Out of Stock' | 'Low Stock';

function getStatus(stock_qty: number): Status {
    if (stock_qty === 0) return 'Out of Stock';
    if (stock_qty <= 10) return 'Low Stock';
    return 'In Stock';
}

export default function InventoryPage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const [products, setProducts] = useState<ItemEmployee[]>([]);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("All");
    const [status, setStatus] = useState<("All") | Status>("All");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        if (!token) {
            router.push('/login');
            return;
        }

        if (user && !['employee', 'manager', 'admin'].includes(user.role)) {
            router.push('/home/dashboard');
            return;
        }

        loadProducts();
    }, [token, user, router]);

    const loadProducts = async () => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);
            const items = await listItems(token, { status: 'all', limit: 200 });
            setProducts(items);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const categories = useMemo(
        () => ["All", ...Array.from(new Set(products.map((p) => toTitleCase(p.category) || 'Uncategorized')))],
        [products]
    );
    
    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
        const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.id.toString().includes(query);
        const matchesCategory = category === "All" || 
            toTitleCase(p.category) === category || 
            (!p.category && category === 'Uncategorized');
        const itemStatus = getStatus(p.stock_qty);
        const matchesStatus = status === "All" || itemStatus === status;
        return matchesQuery && matchesCategory && matchesStatus;
        });
    }, [products, query, category, status]);

    if (loading) {
        return (
            <div className="inventory-page">
                <p>Loading inventory...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="inventory-page">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                    <button
                        onClick={loadProducts}
                        className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 rounded"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

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
                                        {p.image_url ? (
                                            <img 
                                                src={p.image_url} 
                                                alt={p.name}
                                                className="w-full h-full object-cover rounded"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                }}
                                            />
                                        ) : null}
                                        <Icons.Package2 className={`thumb-icon ${p.image_url ? 'hidden' : ''}`} />
                                    </div>
                                    <span className ="product-name">{p.name}</span>
                                </div>
                            </td>
                            <td className="muted">{p.id}</td>
                            <td className="muted">{p.name}</td>
                            <td><span className="qty-pill">{p.stock_qty}</span></td>
                            <td><StatusBadge status={getStatus(p.stock_qty)} /></td>
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

