import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
        ],
    },
    experimental: {
        viewTransition: true
    },
    output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined
};

module.exports = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/landingPage",
        permanent: false,
      },
    ];
  },
};


export default nextConfig;
