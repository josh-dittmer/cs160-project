import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { ItemsByCategoryResponse } from "../api/models";
import { get, request } from "../api/request";

export const useItemsQuery = () => {
    const { isAuthenticated, token } = useAuth();

    return useQuery({
        queryKey: ['items'],
        queryFn: () => request('/api/items?group_by=category', get({
            decoder: ItemsByCategoryResponse
        }))
    })
}