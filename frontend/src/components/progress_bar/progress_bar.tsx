"use client";
import { OrderT } from "@/lib/api/models";
import { CheckCircle, Home, Package, Truck } from "lucide-react";
import { useState } from "react";

export default function DeliveryProgress({ order }: { order: OrderT }) {
    // currentStep can be 1–4
    const [currentStep, setCurrentStep] = useState(3);

    const steps = [
        { id: 1, label: "Order Placed", icon: <CheckCircle className="w-5 h-5" /> },
        { id: 2, label: "Shipped", icon: <Package className="w-5 h-5" /> },
        { id: 3, label: "Out for Delivery", icon: <Truck className="w-5 h-5" /> },
        { id: 4, label: "Delivered", icon: <Home className="w-5 h-5" /> },
    ];

    return (
        <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-medium text-lg mb-4">Delivery Progress</h2>

            <div className="flex items-center justify-between relative">
                {/* Connector line behind icons */}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0" />
                <div
                    className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 z-0 transition-all duration-700"
                    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step) => (
                    <div key={step.id} className="flex flex-col items-center z-10 w-1/4">
                        <div
                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${step.id <= currentStep
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-gray-300 bg-white text-gray-400"
                                }`}
                        >
                            {step.icon}
                        </div>
                        <span
                            className={`mt-2 text-xs font-medium text-center ${step.id <= currentStep ? "text-green-600" : "text-gray-400"
                                }`}
                        >
                            {step.label}
                        </span>
                    </div>
                ))}
            </div>

            {/* button for demo */}
            <div className="flex justify-center mt-6">
                <button
                    onClick={() => setCurrentStep((prev) => (prev < 4 ? prev + 1 : 1))}
                    className="text-sm bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition"
                >
                    Next Step
                </button>
            </div>
        </div>
    );
}
