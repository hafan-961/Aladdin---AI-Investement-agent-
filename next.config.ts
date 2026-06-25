import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure server-side packages are not bundled into the client
  serverExternalPackages: [
    "@langchain/core",
    "@langchain/openai",
    "@langchain/langgraph",
    "langchain",
  ],
  // Optimize for Vercel deployment
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
