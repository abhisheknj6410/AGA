/** @type {import('next').NextConfig} */
const nextConfig = {
  // Point to project root so Next.js doesn't complain about multiple lockfiles
  outputFileTracingRoot: new URL('..', import.meta.url).pathname,
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
