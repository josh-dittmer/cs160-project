'use client'
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import { listItems, updateItemStock, ItemEmployee } from "@/lib/api/employee";
import { CardTable } from "@/components/employee_table/card_table";
import { StatusBadge } from "@/components/employee_table/status_badge";
import { Icons } from "@/components/employee_table/icons";
import  Modal  from "@/components/modal/modal";
import { toTitleCase } from "@/lib/util/categoryHelpers";


type Status = 'In Stock' | 'Out of Stock' | 'Low Stock';

function getStatus(stock_qty: number): Status {
    if (stock_qty === 0) return 'Out of Stock';
    if (stock_qty <= 10) return 'Low Stock';
    return 'In Stock';
}

export default function StockManagementPage(){
    const { token, user } = useAuth();
    const router = useRouter();
    
    //State for table and filtering
    const[products, setProducts] = useState<ItemEmployee[]>([]);
    const[query, setQuery] = useState('');
    const[category, setCategory] = useState('All');
    const[status, setStatus] = useState< 'All' | Status>('All');
    const[loading, setLoading] = useState(true);
    const[error, setError] = useState<string | null>(null);

    //States for modals
    const [qtyOpen, setQtyOpen] = useState(false);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [qtyInput, setQtyInput] = useState<string>('0');
    const [saving, setSaving] = useState(false);

    const asInt = (s: string) => Math.max(0, parseInt(s || '0', 10) || 0);

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

    const categories = useMemo(() => ['All',...Array.from(new Set(products.map((p)=> toTitleCase(p.category) || 'Uncategorized')))],
    [products]);

    const filtered = useMemo(()=>{
        return products.filter((p) =>{
            const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.id.toString().includes(query);
            const matchesCategory = category === 'All' || 
                toTitleCase(p.category) === category || 
                (!p.category && category === 'Uncategorized');
            const itemStatus = getStatus(p.stock_qty);
            const matchesStatus = status === 'All' || itemStatus === status;
            return matchesQuery && matchesCategory && matchesStatus;
        });
    },[products,query,category,status]);

    //Opens the update quantity modal
    const handleOpenQty = (id: number) => {
        const cur = products.find((p)=> p.id === id)?.stock_qty ?? 0;
        setQtyInput(String(cur));
        setActiveId(id);
        setQtyOpen(true);
    }

    //Saves changes from the update quantity modal
    const handleSaveQty = async ()=>{
        if (!activeId || !token) return;
        
        try {
            setSaving(true);
            const newQty = asInt(qtyInput);
            await updateItemStock(token, activeId, newQty);
            
            // Update local state
            setProducts(prev => prev.map(p => 
                p.id === activeId ? { ...p, stock_qty: newQty } : p
            ));
            
            setQtyOpen(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to update stock quantity');
        } finally {
            setSaving(false);
        }
    }

    //Sets quantity to zero and marks item 'Out of Stock'
    const handleMarkOOS = async (id: number) =>{
        if (!token) return;
        
        try {
            await updateItemStock(token, id, 0);
            
            // Update local state
            setProducts(prev => prev.map(p => 
                p.id === id ? { ...p, stock_qty: 0 } : p
            ));
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to mark item out of stock');
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <p>Loading products...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
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

    return(
        <div className="p-8">
            <h1 className="mb-6 text-5xl font-semibold tracking-tight">Stock Management</h1>
            
            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className = "relative">
                    <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <input
                    value = {query}
                    onChange={(e)=> setQuery(e.target.value)}
                    placeholder="Search Products"
                    className="h-10 w-[240px] rounded-xl border border-zinc-200 pl-9 pr-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-300"
                    />      
                </div>
                <select 
                value={category}
                onChange = {(e)=> setCategory(e.target.value)}
                className ="h-10 w-[180px] rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-300">
                {categories.map((c)=>(
                    <option key={c}>{c}</option>
                ))}
                </select>

                <select
                value = {status}
                onChange = {(e)=> setStatus(e.target.value as 'All' | Status)}
                className="h-10 w-[160px] rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:border-zinc-300"
                >
                {['All', 'In Stock', 'Out of Stock', 'Low Stock'].map((s)=>(
                    <option key={s}>{s}</option>

                ))}
                </select>
            </div>

            <CardTable>
                <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Quantity</th>
                    <th className="px-4 py-3 font-medium text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {filtered.map((p)=>(
                        <tr key={p.id} className="hover:bg-zinc-50/60">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {p.image_url ? (
                                        <img 
                                            src={p.image_url} 
                                            alt={p.name}
                                            className="h-8 w-8 rounded-md object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 ${p.image_url ? 'hidden' : ''}`}>
                                        <Icons.Package2 className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <span className="font-medium text-zinc-900">{p.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{p.id}</td>
                            <td className="px-4 py-3">
                                <StatusBadge status={getStatus(p.stock_qty)} />
                            </td>
                            <td className="px-4 py-3 text-center text-zinc-600">
                                <div className="inline-flex h-6 w-10 items-center justify-center rounded-md bg-zinc-100 text-xs font-medium text-zinc-700">
                                    {p.stock_qty}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex justify-start gap-3">
                                    <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                                    onClick={()=> handleMarkOOS(p.id)}>
                                    Mark OOS
                                    </button>
                                    <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                                    onClick={()=> handleOpenQty(p.id)}>
                                    Update QTY
                                    </button>
                                </div>
                            </td>
                        </tr>

                    ))}
                    {filtered.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                No Products match the filters you selected
                            </td>
                        </tr>
                    )}
                </tbody>
            </CardTable>

            {/* Update Quantity Modal*/}
            <Modal open={qtyOpen} onClose={()=> setQtyOpen(false)} title="Update Quantity" footer={
                <div className="flex gap-3">
                    <button 
                        className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        onClick={handleSaveQty}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
                    onClick={()=>setQtyOpen(false)}
                    disabled={saving}>
                        Cancel
                    </button>
                </div>
            }>
                <div className="flex items-center gap-2">
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-xl hover:bg-zinc-200"
                    onClick={()=> setQtyInput(String(asInt(qtyInput) - 1))} aria-label ="Decrease">
                    -    
                    </button>

                    <input className="h-9 w-24 rounded-lg border border-zinc-200 text-center font-semibold" type="text" inputMode="numeric"
                    value={qtyInput} onChange={(e)=> {
                        {/*Allow only digits */}
                        const raw = e.target.value.replace(/\D+/g, '');
                        if (raw === ''){
                            setQtyInput('0');
                        }
                        else{
                            setQtyInput(String(parseInt(raw,10)))
                        }
                    }} />

                    <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-xl hover:bg-zinc-200"
                    onClick={()=> setQtyInput(String(asInt(qtyInput) + 1))} aria-label ="Increase">
                    +   
                    </button>  
                </div>
            </Modal>
        </div>
    );
}



