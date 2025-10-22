import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { OrderResponse } from "../api/models";
import { get, request } from "../api/request";

export const useOrdersQuery = () => {
    const { isAuthenticated, token } = useAuth();

    return useQuery({
        queryKey: ['orders'],
        queryFn: () => request('/api/orders', get({
            token: token ?? undefined,
            decoder: OrderResponse
        })),
        enabled: isAuthenticated
    })
}