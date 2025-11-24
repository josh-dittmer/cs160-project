
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  experimental: {
    viewTransition: true,
  },

  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

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

module.exports = nextConfig;
