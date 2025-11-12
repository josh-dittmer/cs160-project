import { OrderT } from "@/lib/api/models";
import { CheckCircle, Home, Package, Truck } from "lucide-react";

export default function DeliveryProgress({ order }: { order: OrderT }) {
    const steps = [
        { id: 1, label: 'Order placed', Icon: CheckCircle },
        { id: 2, label: 'Packing order', Icon: Package },
        { id: 3, label: 'Out for delivery', Icon: Truck },
        { id: 4, label: 'Delivered', Icon: Home },
    ];

    const currStep = order.status === 'packing' ? 2 : 3;

    return (
        <div>
            <div>
                <h2 className="text-fg-dark font-bold">
                    {order.status === 'packing' && (
                        <span>Your order is being packed!</span>
                    )}
                    {order.status === 'shipped' && (
                        <span>Your order is on the way!</span>
                    )}
                </h2>
                <h3 className="text-fg-medium text-xs">
                    {order.status === 'packing' && (
                        <span>Your order is being loaded onto an autonomous delivery vehicle.</span>
                    )}
                </h3>
            </div>
            <div className="flex items-center justify-between relative p-2 transition-all">

                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-bg-medium rounded-full" />
                <div
                    className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-1 bg-bg-accent rounded-full"
                    style={{ width: `${((currStep - 1) / (steps.length - 1)) * 100}%` }}
                />
                {steps.map((step) =>
                    <div
                        key={step.id}
                        className={`z-10 p-1 rounded-full ${currStep >= step.id ? 'bg-bg-accent' : 'bg-bg-medium'}`}
                    >
                        <step.Icon
                            width={20}
                            height={20}
                            className={currStep >= step.id ? 'text-fg-accent' : 'text-fg-light'}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}