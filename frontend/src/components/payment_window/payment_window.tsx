'use client';

import { PaymentWindowContext } from "@/contexts/payment_window";
import { useSetupIntentQuery } from "@/lib/queries/setup_intent";
import { stripePromise } from "@/lib/stripe";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { StripeElementsOptions, StripePaymentElementOptions } from "@stripe/stripe-js";
import { AnimatePresence, motion } from "motion/react";
import { useContext, useState } from "react";

function SetupForm() {
    const stripe = useStripe();
    const elements = useElements();
    const paymentWindowContext = useContext(PaymentWindowContext);


    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const paymentElementOptions: StripePaymentElementOptions = {
        layout: 'tabs'
    };

    const handleClose = (e: React.FormEvent) => {
        e.preventDefault();
        paymentWindowContext?.setVisible(false);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setLoading(true);

        const { error } = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: 'http://localhost:3000/home/dashboard',
            }
        });

        if (error) {
            setMessage(error.message || "An unexpected error occurred.");
        }

        setLoading(false);
    }

    return (
        <form onSubmit={handleSubmit} className="h-full">
            <div className="flex flex-col gap-4 justify-center items-center w-full h-full">
                <div className="w-full h-full flex justify-center items-center">
                    <PaymentElement options={paymentElementOptions} className="w-full h-full" />
                </div>
                {message && <div className="mt-4 text-red-500">{message}</div>}
                <div className="flex items-end gap-4 w-full justify-center">
                    <motion.button
                        whileTap={{ scale: 0.99 }}
                        className="w-full p-2 rounded-xl bg-bg-medium hover:bg-bg-dark font-bold"
                        onClick={handleClose}
                    >
                        <span>Cancel</span>
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.99 }}
                        disabled={loading || !stripe || !elements}
                        type="submit"
                        className="w-full p-2 rounded-xl bg-bg-medium hover:bg-bg-accent font-bold"
                    >
                        <span>{loading ? "Loading..." : `Save`}</span>
                    </motion.button>
                </div>
            </div>
        </form>
    )
}

export default function PaymentWindow() {
    const paymentWindowContext = useContext(PaymentWindowContext);

    const { data } = useSetupIntentQuery();

    const options: StripeElementsOptions = {
        clientSecret: data?.clientSecret,
        customerSessionClientSecret: data?.customerSessionClientSecret,
        appearance: {
            theme: 'stripe' as const,
        },
    }

    return (
        <AnimatePresence>
            {paymentWindowContext?.visible && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.75 }}
                        exit={{ opacity: 0 }}
                        className="bg-black w-svw h-svh fixed top-0 left-0 z-50 pointer-events-auto"
                    />
                    <div className="fixed top-0 left-0 z-60 w-svw h-svh flex justify-center items-center pointer-events-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="bg-bg-light p-4 w-full h-full md:max-w-196 md:max-h-152 md:rounded-xl overflow-y-scroll"
                        >
                            <Elements stripe={stripePromise} options={options}>
                                <SetupForm />
                            </Elements>
                        </motion.div>
                    </div>
                </>
            )}

        </AnimatePresence>
    )
}