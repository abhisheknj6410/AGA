/** @type {import('next').NextConfig} */
const nextConfig = {
  // Point to project root so Next.js doesn't complain about multiple lockfiles
  outputFileTracingRoot: new URL('..', import.meta.url).pathname,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
