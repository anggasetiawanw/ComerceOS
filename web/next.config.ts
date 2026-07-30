import type { NextConfig } from 'next';

const supabaseImageHostname = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_HOSTNAME;

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/@:username', destination: '/:username' },
        { source: '/@:username/produk/:slug', destination: '/:username/produk/:slug' },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  images: {
    remotePatterns: supabaseImageHostname
      ? [{ protocol: 'https', hostname: supabaseImageHostname }]
      : [],
  },
};

export default nextConfig;
