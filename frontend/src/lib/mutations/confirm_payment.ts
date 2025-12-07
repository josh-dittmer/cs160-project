import { ConfirmPaymentRequestT, ConfirmPaymentResponse } from "@/lib/api/models";
import { post, request } from "@/lib/api/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type ConfirmPaymentVars = {
    request: ConfirmPaymentRequestT,
    token: string
}

export const useConfirmPaymentMutation = () => {
    const client = useQueryClient();

    return useMutation({
        mutationFn: (vars: ConfirmPaymentVars) => request('/api/payment/confirm-payment/', post({
            token: vars.token,
            decoder: ConfirmPaymentResponse,
            payload: vars.request
        })),
        mutationKey: ['confirmPayment'],
        onSuccess: (data) => {
            client.invalidateQueries({ queryKey: ['orders', data.orderId] });
            client.invalidateQueries({ queryKey: ['cartItems'] });
        },
        retry: 0
    });
}