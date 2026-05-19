/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    typedRoutes: false
  },
  // Add this rewrite configuration:
  async rewrites() {
    return [
      {
        // Forwards socket.io traffic to the Express server
        source: '/socket.io/:path*',
        destination: 'http://127.0.0.1:3001/socket.io/:path*',
      },
      {
        // Forwards your LiveKit token endpoint to the Express server
        source: '/livekit-token',
        destination: 'http://127.0.0.1:3001/livekit-token',
      },
      {
        // Forwards backend health checks
        source: '/health',
        destination: 'http://127.0.0.1:3001/health',
      }
    ];
  }
};

export default nextConfig;