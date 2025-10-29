import { useAuth } from "@/contexts/auth";
import { useQuery } from "@tanstack/react-query";
import { CreatePaymentIntentResponse } from "../api/models";
import { get, request } from "../api/request";

export const usePaymentIntentQuery = () => {
    const { isAuthenticated, token } = useAuth();

    return useQuery({
        queryKey: ['paymentIntent'],
        queryFn: () => request('/api/payment/create-payment-intent', get({
            token: token ?? undefined,
            decoder: CreatePaymentIntentResponse
        })),
        enabled: isAuthenticated
    })
};