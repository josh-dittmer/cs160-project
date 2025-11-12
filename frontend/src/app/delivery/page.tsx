"use client";

import { useState, useEffect } from "react";
import {useLoadScript, GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import DeliveryProgress from "@/components/progress_bar/progress_bar";

export default function DeliveryPage() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ["geometry", "places"],
  });

  const store = { lat: 37.3352, lng: -121.8811 }; // SJSU area

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [pathPoints, setPathPoints] = useState<google.maps.LatLngLiteral[]>([]);
  const [robot, setRobot] = useState(store);
  const [currentStep, setCurrentStep] = useState(1);
  const [address, setAddress] = useState("123 Main St, San Jose, CA");
  const [center, setCenter] = useState({
    lat: (store.lat + 37.3229) / 2,
    lng: (store.lng + -121.8832) / 2,
  });

  // Fetch a new route between store and the destination address
  const fetchRoute = (destination: string) => {
    if (!isLoaded || !destination) return;

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: store,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);

          // Decode full route
          const route = result.routes[0].overview_path;
          const coords = route.map((p) => ({ lat: p.lat(), lng: p.lng() }));
          setPathPoints(coords);
          setRobot(store); // reset robot to start

          // Compute map center between store and new destination
          const end = route[route.length - 1];
          setCenter({
            lat: (store.lat + end.lat()) / 2,
            lng: (store.lng + end.lng()) / 2,
          });
        } else {
          alert("Could not find route. Try another address.");
        }
      }
    );
  };

  // Load default route initially
  useEffect(() => {
    if (isLoaded) fetchRoute(address);
  }, [isLoaded]);

  // Move robot when progressing
  const handleNextStep = () => {
    setCurrentStep((prev) => {
      const next = prev < 4 ? prev + 1 : 1;
      moveRobot(next);
      return next;
    });
  };

  const moveRobot = (step: number) => {
    if (pathPoints.length === 0) return;

    let targetIndex;
    if (step === 1) targetIndex = 0;
    else if (step === 2) targetIndex = Math.floor(pathPoints.length / 3);
    else if (step === 3) targetIndex = Math.floor((2 * pathPoints.length) / 3);
    else targetIndex = pathPoints.length - 1;

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
                <p>Address: {address}</p>
                <p>Amount: $32.50</p>
              </div>
            </section>

            {/* Progress Bar */}
            <DeliveryProgress currentStep={currentStep} onNextStep={handleNextStep} />

            {/* Address tester */}
            <section className="bg-white rounded-2xl shadow p-5">
              <h2 className="font-medium text-lg mb-2">Test Different Address</h2>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter destination address"
                className="border border-gray-300 rounded-md w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => fetchRoute(address)}
                  className="text-sm bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition"
                >
                  Test Route
                </button>
              </div>
            </section>

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
              zoom={13}
              center={center}
              mapContainerStyle={{ width: "100%", height: "725px" }}
            >
              {directions && <DirectionsRenderer directions={directions} />}
              <Marker position={store} label="Store" />
              <Marker position={robot} label="Robot" />
            </GoogleMap>
          </div>
        </div>
      </main>
    </>
  );
}
