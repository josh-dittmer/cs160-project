export type Status = "In Stock" | "Out of Stock" | "Low Stock";
export type ConditionFlag = 'Expired' | 'Damaged' | null;

export type Product = {
    id: string;
    name: string;
    category: string;
    quantity: number;
    status: Status;
    ImageUrl?: string;
    condition?: ConditionFlag;

};