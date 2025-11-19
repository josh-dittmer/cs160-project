import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { OrderRouteResponse } from "../api/models";
import { get, request } from "../api/request";

export const useOrderRouteQuery = (orderId: number) => {
    const { isAuthenticated, token } = useAuth();

    return useQuery({
        queryKey: ['orderRoute', orderId],
        queryFn: () => request(`/api/vehicle/order-route/${orderId}`, get({
            token: token ?? undefined,
            decoder: OrderRouteResponse
        })),
        enabled: isAuthenticated
    })
}