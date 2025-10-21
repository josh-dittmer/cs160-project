import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { CartItemsResponse } from "../api/models";
import { get, request } from "../api/request";

export const useCartItemsQuery = () => {
    const { token } = useAuth();

    return useQuery({
        queryKey: ['cartItems'],
        queryFn: () => request('/api/cart', get({
            token: token ?? undefined,
            decoder: CartItemsResponse
        }))
    })
};