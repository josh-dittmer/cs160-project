import { AddressContext } from "@/contexts/address";
import { useAuth } from "@/contexts/auth";
import { usePaymentIntentQuery } from "@/lib/queries/payment_intent";
import { stripePromise } from "@/lib/stripe";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Appearance, StripePaymentElementOptions } from "@stripe/stripe-js";
import { motion } from "motion/react";
import { useContext, useState } from "react";

function CheckoutForm({ totalCents }: { totalCents: number }) {
    const { user } = useAuth();

    const stripe = useStripe();
    const elements = useElements();

    const addressContext = useContext(AddressContext);

    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setLoading(true);

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: 'http://localhost:3000/payment/complete',
            }
        })

        if (error.type === 'card_error' || error.type === 'validation_error') {
            setMessage(error.message || null);
        } else {
            setMessage("An unexpected error occurred.");
        }

        setLoading(false);
    };

    const paymentElementOptions: StripePaymentElementOptions = {
        layout: 'tabs'
    };

    return (
        <div className="flex flex-col gap-4 justify-center items-center">
            <div className="w-full">
                <PaymentElement options={paymentElementOptions} />
            </div>
            {!user?.address && (
                <button
                    className="w-full p-4 rounded-xl bg-bg-dark hover:bg-bg-accent font-bold"
                    onClick={() => addressContext?.setWindowVisible(true)}
                >
                    Select Address
                </button>
            )}
            {user?.address && (
                <motion.button
                    whileTap={{ scale: 0.99 }}
                    disabled={loading || !stripe || !elements}
                    onClick={handleSubmit}
                    className="w-full p-4 rounded-xl bg-bg-dark hover:bg-bg-accent font-bold"
                >
                    <span>{loading ? "Loading..." : `Pay $${(totalCents / 100).toFixed(2)} now`}</span>
                </motion.button>
            )}
            {message && <div className="mt-4 text-red-500">{message}</div>}
        </div>
    )
}

export default function StripePayment() {
    const { data } = usePaymentIntentQuery();

    const appearance: Appearance = {
        theme: 'stripe'
    };

    const loader = 'auto';

    if (!data) return <p>Loading...</p>

    return (
        <>
            <Elements options={{ clientSecret: data.clientSecret, customerSessionClientSecret: data.customerSessionClientSecret, appearance: appearance, loader: loader }} stripe={stripePromise}>
                <CheckoutForm totalCents={data.totalCents} />
            </Elements>
        </>
    )
}