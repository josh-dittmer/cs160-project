'use client';

import LoadingSpinner from "@/components/loading_spinner/loading_spinner";
import { useAuth } from "@/contexts/auth";
import { useConfirmPaymentMutation } from "@/lib/mutations/confirm_payment";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function displayAddress(address: string, city: string | null, state: string | null, zipcode: string | null) {
    return `${address}, ${city}, ${state} ${zipcode}`;
}

export default function PaymentCompletePage() {
    const searchParams = useSearchParams();

    const intentId = searchParams.get("payment_intent");
    const clientSecret = searchParams.get("payment_intent_client_secret");

    const { token, user } = useAuth();

    const { mutate, data, isError, isPending } = useConfirmPaymentMutation();

    const router = useRouter();

    useEffect(() => {
        if (token &&
            intentId &&
            clientSecret &&
            user?.address &&
            user?.longitude &&
            user?.latitude) {
            mutate({
                request: {
                    intentId,
                    clientSecret,
                    displayAddress: displayAddress(
                        user.address,
                        user.city,
                        user.state,
                        user.zipcode
                    ),
                    latitude: user.latitude,
                    longitude: user.longitude
                },
                token: token
            });
        }
    }, [token, intentId, clientSecret, mutate]);

    useEffect(() => {
        if (data) {
            router.push('/home/orders');
        }
    }, [data]);

    return (
        <div className="flex justify-center items-center">
            <div className="flex items-center justify-center gap-4 border border-bg-dark p-5 rounded-xl shadow">
                {((!data || isPending) && !isError) && (
                    <>
                        <LoadingSpinner width={75} height={75} />
                        <p className="text-fg-medium text-lg font-bold">Submitting order...</p>
                    </>
                )}
                {isError && (
                    <div>
                        <p className="text-fg-medium text-lg font-bold">Something went wrong!</p>
                    </div>
                )}
                {data && (
                    <>
                        <LoadingSpinner width={75} height={75} />
                        <p className="text-fg-medium text-lg font-bold">Success!</p>
                    </>
                )}
            </div>
        </div>
    )
}