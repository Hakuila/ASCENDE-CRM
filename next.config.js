/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // ajustar para o domínio do projeto Supabase (Storage) em produção
        hostname: "*.supabase.co",
      },
    ],
  },
};

module.exports = nextConfig;
