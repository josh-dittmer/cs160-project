export type Status = "In Stock" | "Out of Stock" | "Low Stock";

export type Product = {
    id: string;
    name: string;
    category: string;
    quantity: number;
    status: Status;
    ImageUrl?: string;
};