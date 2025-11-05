import { useAuth } from "@/contexts/auth";
import { GenericResponse, UpsertCartItemRequest } from "@/lib/api/models";
import { post, request } from "@/lib/api/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useUpsertCartItemMutation = () => {
    const client = useQueryClient();
    const { token } = useAuth();

    return useMutation({
        mutationFn: (vars: UpsertCartItemRequest) => request('/api/cart', post({
            token: token ?? undefined,
            decoder: GenericResponse,
            payload: vars
        })),
        mutationKey: ['upsertCartItem'],
        onSuccess: () => {
            client.invalidateQueries({ queryKey: ['cartItems'] });
            client.invalidateQueries({ queryKey: ['paymentIntent'] });

        }
    });
}