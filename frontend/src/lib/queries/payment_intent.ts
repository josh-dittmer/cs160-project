import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { CreatePaymentIntentResponse } from "../api/models";
import { get, request } from "../api/request";

export const usePaymentIntentQuery = () => {
    const { isAuthenticated, token, user } = useAuth();

    return useQuery({
        queryKey: ['paymentIntent', user?.id ?? 'anonymous'],
        queryFn: () => request('/api/payment/create-payment-intent', get({
            token: token ?? undefined,
            decoder: CreatePaymentIntentResponse
        })),
        enabled: isAuthenticated,
        staleTime: Infinity,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    })
};