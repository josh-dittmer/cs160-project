'use client';

import { useAuth } from "@/contexts/auth";
import { useConfirmPaymentMutation } from "@/lib/mutations/confirm_payment";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PaymentCompletePage() {
    const searchParams = useSearchParams();

    const intentId = searchParams.get("payment_intent");
    const clientSecret = searchParams.get("payment_intent_client_secret");

    const { token } = useAuth();

    const { mutate, data, isError, isPending } = useConfirmPaymentMutation();

    useEffect(() => {
        if (token && intentId && clientSecret) {
            mutate({
                request: { intentId, clientSecret },
                token: token
            });
        }
    }, [token, intentId, clientSecret, mutate]);

    if ((!data || isPending) && !isError) {
        return (
            <p>Loading...</p>
        )
    }

    if (isError) {
        return (
            <p>Error confirming payment.</p>
        )
    }

    return (
        <div>
            <p>Payment complete!</p>
            <p>Order ID: {data.orderId}</p>
        </div>
    )
}