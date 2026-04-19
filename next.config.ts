import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules[\\/]onnxruntime-web[\\/]/ },
    ];
    return config;
  },
};

export default nextConfig;
