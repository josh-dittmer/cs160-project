import type { Product } from "./tableTypes";

// HARD CODED PRODUCTS FOR DEMO PURPOSES NEED TO REPLACE WITH ACTUAL API CALLS
const MOCK_PRODUCTS: Product[] = [
    { id: "10001", name: "Apples", category: "Fruits", quantity: 12, status: "In Stock"},
    { id: "10002", name: "Lettuce", category: "Vegetables", quantity: 0, status: "Out of Stock"},
    { id: "10003", name: "Eggs", category: "Dairy", quantity: 3, status: "Low Stock" },
    { id: "10004", name: "Spinach", category: "Vegetables", quantity: 22, status: "In Stock" },
    { id: "10005", name: "Sirloin Steak", category: "Meat", quantity: 2, status: "Low Stock" },
];

const baseURL = ""; // Replace backend API base URL later

export async function fetchProducts(): Promise<Product[]> {
    /* fill in with actual API logic later 
    for example:
    const response = await fetch(`${baseURL}/products`);
    this can be implemented in next sprint 
    */

    return Promise.resolve(MOCK_PRODUCTS); // Replace with actual API call later
}

