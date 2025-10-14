import type {Status} from "@/lib/api/tableTypes";

export function StatusBadge({status}: {status: Status}) {
    const tone =
        status === "In Stock" ? "status-green" :
        status === "Out of Stock" ? "status-red" :
        "status-yellow";

        return <span className={`status-badge ${tone}`}>{status}</span>;
}