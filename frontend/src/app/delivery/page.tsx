// app/delivery/page.tsx
"use client";
import { useState } from "react";
import { MapPin, Clock, Truck, CheckCircle } from "lucide-react";
import TopBar from "@/components/top-bar/top-bar";
import DeliveryProgress from "@/components/progress_bar/progress_bar";

export default function DeliveryPage() {

  return (
    <>
    <TopBar/>
    <main className="bg-gray-50 p-8 ">
        <h1 className="text-2xl font-semibold mb-6">Delivery Status</h1>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column (cards) */}
            <div className="flex flex-col gap-6">
            {/* Order Summary */}
            <section className="bg-white rounded-2xl shadow p-5 space-y-2">
                <h2 className="font-medium text-lg">Order Summary</h2>
                <div className="text-gray-600 text-sm space-y-1">
                <p>Order placed date: Oct 23, 2025</p>
                <p>Order Number: fgh12345678</p>
                <p>Address: 123 Main St, San Jose, CA</p>
                <p>Amount: $32.50</p>
                </div>
            </section>

            {/* Tracking */}
            <DeliveryProgress />

            {/* Driver Info */}
            <section className="bg-white rounded-2xl shadow p-5">
                <h2 className="font-medium text-lg">Tracking Info</h2>
                <div className="text-gray-600 text-sm space-y-1">
                <p>Robot ID: abc12345678</p>
                <p>Estimated date: Oct 25, 2025</p>

                </div>
                <div className="flex justify-center mt-6">
                <button className="text-sm bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition">
                        Cancel
                </button>
                </div>
            </section>
            </div>

            {/* Right column (map area) */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow flex items-center justify-center text-gray-500 text-2xl">
            Map Preview / Real time tracking(placeholder)
            </div>
        </div>
    </main>
    
    </>

  );
}
