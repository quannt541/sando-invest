/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Ngăn webpack bundle các Node.js module vào client-side
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // yahoo-finance2 và các Node module chỉ chạy server-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs:   false,
        net:  false,
        tls:  false,
        dns:  false,
        path: false,
        os:   false,
        stream: false,
        crypto: false,
      };
    }
    return config;
  },

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

module.exports = nextConfig;
