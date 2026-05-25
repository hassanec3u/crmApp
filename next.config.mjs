/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      // Google avatars (sign-in via Google)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Supabase public storage (avatars, documents publics éventuels)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
