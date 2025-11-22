"use client";
import React from "react";
import { motion } from "framer-motion";
import { MapPin, Truck, ShoppingBag } from "lucide-react";

export default function OFSOfficialLandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Hero Section */}
      <section className="bg-green-500 text-white h-screen flex flex-col justify-center px-6 text-center bg-cover bg-center">
        <img src="/logo.png" alt="OFS Logo" className="mx-auto w-40 h-20" />
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-4xl font-bold mb-4"
        >
          On-Demand Food Delivery Service (OFS)
        </motion.h1>
        <p className="text-lg max-w-xl mx-auto">
          Fresh groceries, lightning-fast delivery, and a smart robot-powered route system.
          Your city’s most reliable food delivery platform.
        </p>
        <div className="py-10 text-center space-x-4">
            <a href="/login">
                <button className="bg-white text-green-700 font-semibold px-6 py-3 rounded-xl shadow hover:bg-gray-100 transition">Sign In</button>
            </a>
            <a href="signup">
                <button className="bg-green-800 text-white font-semibold px-6 py-3 rounded-xl shadow hover:bg-green-900 transition">Sign Up</button>

            </a>
        </div>
      </section>

      {/* Fresh & Healthy Section */}
        <section className="relative py-24 px-6 text-center bg-cover bg-center" style={{ backgroundImage: "url('/fruit-landing_page.jpg')" }}>
        <div className="bg-black opacity-70 max-w-3xl mx-auto p-8 rounded-2xl">
            <h2 className="text-4xl font-bold mb-4 text-white">Fresh • Organic • Healthy</h2>
            <p className="text-lg leading-relaxed text-gray-100">

            All our fruits and vegetables are carefully selected from trusted farms.
            We focus on providing clean, natural, and nutrient-rich produce to support a healthier lifestyle.
            With OFS, you enjoy the freshest items delivered right to your door.
            </p>
        </div>
        </section>


      {/* Introduction */}
      <section className="max-w-5xl mx-auto py-16 px-6">
        <h2 className="text-3xl font-semibold mb-4">About OFS</h2>
        <p className="text-lg leading-relaxed">
          OFS is a on-demand food delivery service built for convenience and reliability.
          We focus on organic products, real‑time delivery tracking, robot-assisted route optimization,
          and a clean shopping experience. Whether you're at home or work, OFS makes grocery delivery
          simple and fast.
        </p>
      </section>

        {/* Address Section */}
      <section className="max-w-5xl mx-auto py-16 px-6">
        <h2 className="text-3xl font-semibold mb-6">Our Headquarters</h2>
        <div className="flex items-center gap-4 text-lg">
          <MapPin className="text-green-600" />
          <span>1 Washington Sq, San Jose, CA 95192</span>
        </div>
      </section>


      {/* Functions Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-semibold mb-10 text-center">What You Can Do With OFS</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Function 1 */}
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <ShoppingBag className="mx-auto mb-4 text-green-600" size={40} />
              <h3 className="text-xl font-bold mb-2">Shop Fresh Items</h3>
              <p>Browse organic groceries, snacks, and beverages from local stores.</p>
            </div>

            {/* Function 2 */}
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <Truck className="mx-auto mb-4 text-green-600" size={40} />
              <h3 className="text-xl font-bold mb-2">Real-Time Delivery</h3>
              <p>Track your robot-delivery vehicle in real time from checkout to arrival.</p>
            </div>

            {/* Function 3 */}
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <MapPin className="mx-auto mb-4 text-green-600" size={40} />
              <h3 className="text-xl font-bold mb-2">Address Auto-Fill</h3>
              <p>Smart Google Maps integration makes entering your address fast and easy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 text-sm">
        © 2025 OFS — On-Demand Food Delivery Service. All rights reserved.
      </footer>
    </div>
  );
}
