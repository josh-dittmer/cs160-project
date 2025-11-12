"use client";

import { useState, useEffect } from "react";
import {useLoadScript, GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import DeliveryProgress from "@/components/progress_bar/progress_bar";

export default function DeliveryPage() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ["geometry"],
  });

  const store = { lat: 37.3352, lng: -121.8811 };
  const customer = { lat: 37.3229, lng: -121.8832 };

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [pathPoints, setPathPoints] = useState<google.maps.LatLngLiteral[]>([]);
  const [robot, setRobot] = useState(store);
  const [currentStep, setCurrentStep] = useState(1);

  // Request real driving route
  useEffect(() => {
    if (!isLoaded) return;

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: store,
        destination: customer,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);

          const route = result.routes[0].overview_path;
          const coords = route.map((p) => ({ lat: p.lat(), lng: p.lng() }));
          setPathPoints(coords);
        }
      }
    );
  }, [isLoaded]);

  // Move robot when clicking "Next Step"
  const handleNextStep = () => {
    setCurrentStep((prev) => {
      const next = prev < 4 ? prev + 1 : 1;
      moveRobot(next);
      return next;
    });
  };

  // Helper to move robot based on step
  const moveRobot = (step: number) => {
    if (pathPoints.length === 0) return;

    let targetIndex;
    if (step === 1) targetIndex = 0; // at store
    else if (step === 2) targetIndex = Math.floor(pathPoints.length / 3);
    else if (step === 3) targetIndex = Math.floor((2 * pathPoints.length) / 3);
    else targetIndex = pathPoints.length - 1; // delivered

    setRobot(pathPoints[targetIndex]);
  };

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <>
      <main className="bg-gray-50 p-8 min-h-screen">
        <h1 className="text-2xl font-semibold mb-6">Delivery Status</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
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

            {/* Progress bar controlled by DeliveryPage */}
            <DeliveryProgress currentStep={currentStep} onNextStep={handleNextStep} />

            {/* Tracking Info */}
            <section className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-medium text-lg">Tracking Info</h2>
              <div className="text-gray-600 text-sm space-y-1">
                <p>Robot ID: abc12345678</p>
                <p>Status: {["Order Placed", "Shipped", "Out for Delivery", "Delivered"][currentStep - 1]}</p>
              </div>
            </section>
          </div>

          {/* Right column (map) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow overflow-hidden">
            <GoogleMap
              zoom={14}
              center={{
                lat: (store.lat + customer.lat) / 2,
                lng: (store.lng + customer.lng) / 2,
              }}
              mapContainerStyle={{ width: "100%", height: "600px" }}
            >
              {directions && <DirectionsRenderer directions={directions} />}

              {/* Markers */}
              <Marker position={store} label="Store" />
              <Marker position={customer} label="Customer" />
              <Marker position={robot} label="Robot" />
            </GoogleMap>
          </div>
        </div>
      </main>
    </>
  );
}
