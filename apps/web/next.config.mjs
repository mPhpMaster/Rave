/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces .next/standalone for slim container deploys (Dockerfile uses it).
  output: "standalone",
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
