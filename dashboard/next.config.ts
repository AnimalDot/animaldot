import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Use dashboard dir as tracing root so Next doesn't infer a parent lockfile as root
  outputFileTracingRoot: path.resolve(process.cwd()),
};

export default nextConfig;
