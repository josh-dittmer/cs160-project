'use client'
import { useEffect, useMemo, useState } from "react";
import { fetchProducts } from "@/lib/api/products";
import type { Product, Status } from "@/lib/api/tableTypes";
import { CardTable } from "@/components/employee_table/card_table";
import { StatusBadge } from "@/components/employee_table/status_badge";
import { Icons } from "@/components/employee_table/icons";
import { useAlerts, getFlagged } from "@/lib/alerts/alerts-context";
import  Modal  from "@/components/modal/modal"


type FlagKind = 'Expired' | 'Damaged';

export default function StockManagementPage(){
    //State for table and filtering
    const[products, setProducts] = useState<Product[]>([]);
    const[query, setQuery] = useState('');
    const[category, setCategory] = useState('All');
    const[status, setStatus] = useState< 'All' | Status>('All');

    //States for modals
    const [flagOpen, setFlagOpen] = useState(false);
    const [qtyOpen, setQtyOpen] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [qtyInput, setQtyInput] = useState<string>('0');
    const { setFlaggedItems } = useAlerts();

    const asInt = (s: string) => Math.max(0, parseInt(s || '0', 10) || 0);
    //Currently filler data this needs  to connect to back end
    useEffect(()=> {
        fetchProducts().then((rows) => setProducts(rows));
    }, []);

    useEffect(() => {
        setFlaggedItems(getFlagged(products));
    }, [products, setFlaggedItems]);

    const categories = useMemo(() => ['All',...Array.from(new Set(products.map((p)=> p.category)))],
    [products]);

    const filtered = useMemo(()=>{
        return products.filter((p) =>{
            const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.id.includes(query);
            const matchesCategory = category === 'All' || p.category === category;
            const matchesStatus = status === 'All' || p.status === status;
            return matchesQuery && matchesCategory && matchesStatus;

        });
    },[products,query,category,status]);

    const updateProduct = (id: string, mut: (p: Product) => Product) => {
        setProducts((prev)=> prev.map((p)=> (p.id === id ? mut ({...p}) : p)));
    };

    const handleOpenFlag = (id: string) => {
        setActiveId(id);
        setFlagOpen(true);
    }

    /*
    As of right now clicking either expire or damaged sets the status of the item to 'Out of Stock'
    it also updates the products quantity to zero we can update/chnage this later based on what we want
    it to do
    */
    const handleFlag = (kind: FlagKind) =>{
        if(!activeId) return;

        updateProduct(activeId, (p)=> {
            p.condition = kind;
            p.status = 'Out of Stock';
            p.quantity = 0;
            return p;
        });
        setFlagOpen(false);

    }

    //Opens the update quantity modal
    const handleOpenQty = (id:string) => {
        const cur = products.find((p)=> p.id === id)?.quantity ?? 0;
        setQtyInput(String(cur));
        setActiveId(id);
        setQtyOpen(true);
    }

    //Saves changes from the update quantity modal
    const handleSaveQty = ()=>{
        if (!activeId) return;
        updateProduct(activeId, (p)=>{
            const n = asInt(qtyInput)
            p.quantity = n;
            p.status = p.quantity === 0 ? 'Out of Stock' : p.quantity <= 10 ? 'Low Stock' : 'In Stock';
            return p;
        });
        setQtyOpen(false);
    }

    //Sets quantity to zero and marks item 'Out of Stock'
    const handleMarkOOS = (id:string) =>{
        updateProduct(id, (p) => {
            p.quantity = 0;
            p.status = 'Out of Stock';
            return p;
        } );
    };

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
                    <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                    {filtered.map((p)=>(
                        <tr key={p.id} className="hover:bg-zinc-50/60">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100">
                                        <Icons.Package2 className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <span className="font-medium text-zinc-900">{p.name}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{p.id}</td>
                            <td className="px-4 py-3">
                                <StatusBadge status={p.status} />
                            </td>
                            <td className="px-4 py-3 text-center text-zinc-600">
                                <div className="inline-flex h-6 w-10 items-center justify-center rounded-md bg-zinc-100 text-xs font-medium text-zinc-700">
                                    {p.quantity}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex justify-end gap-3">
                                    <button className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                    onClick={()=> handleMarkOOS(p.id)}>
                                    Mark OOS
                                    </button>
                                    <button className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                    onClick={()=> handleOpenFlag(p.id)}>
                                    Flag D/E
                                    </button>
                                    <button className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                                    onClick={()=> handleOpenQty(p.id)}>
                                    Update QYT
                                    </button>
                                </div>
                            </td>
                        </tr>

                    ))}
                    {filtered.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                                No Products match the filers your selected
                            </td>
                        </tr>
                    )}
                </tbody>
            </CardTable>

            {/*Flag  Modal */}
            <Modal open={flagOpen} onClose={()=> setFlagOpen(false)} title="Are you sure you want to flag these items?"
            footer= {
                <div className="flex gap-3">
                    <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    onClick={()=> handleFlag('Expired')}>
                        Expired
                     </button>
                     <button className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
                    onClick={()=> handleFlag('Damaged')}>
                        Damaged
                     </button>
                </div>
            }
            >
            <p className="text-zinc-700">
                *Warning!* By flagging these items either <b>Expired</b> or <b>Damaged</b>, we'll remove them from 
                the customer catalog and will be unavailable for purchase.
            </p>
            </Modal>

            {/* Update Quantity Modal*/}
            <Modal open={qtyOpen} onClose={()=> setQtyOpen(false)} title="Update Quantity" footer={
                <div className="flex gap-3">
                    <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                    onClick={handleSaveQty}>
                        Save
                    </button>
                    <button className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
                    onClick={()=>setQtyOpen(false)}>
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



