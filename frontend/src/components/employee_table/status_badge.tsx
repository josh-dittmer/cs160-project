import type {Status} from "@/lib/api/tableTypes";

export function StatusBadge({status}: {status: Status}) {
    const base = 
    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium,';
    const tone =
        status === "In Stock" ? "bg-emerald-100 text-emerald-700" :
        status === "Out of Stock" ? "bg-rose-100 text-rose-700" :
        "bg-amber-100 text-amber-700";

        return <span className={`${base} ${tone}`}>{status}</span>;
}