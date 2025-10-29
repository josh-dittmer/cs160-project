import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { CreateSetupIntentResponse } from "../api/models";
import { get, request } from "../api/request";

export const useSetupIntentQuery = () => {
    const { isAuthenticated, token } = useAuth();

    return useQuery({
        queryKey: ['setupIntent'],
        queryFn: () => request('/api/payment/create-setup-intent', get({
            token: token ?? undefined,
            decoder: CreateSetupIntentResponse
        })),
        enabled: isAuthenticated
    })
};