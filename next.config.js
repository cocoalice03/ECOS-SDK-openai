/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  async rewrites() {
    return [
      // Rewrites pour les routes avec email
      { source: '/teacher/:email*', destination: '/teacher' },
      { source: '/student/:email*', destination: '/student' },
      { source: '/admin', destination: '/admin' },
      
      // API routes vers le backend Express
      { 
        source: '/api/:path*', 
        destination: process.env.NODE_ENV === 'production' 
          ? `${process.env.BACKEND_URL}/api/:path*`
          : 'http://localhost:3001/api/:path*'
      },
    ];
  },

  // Configuration pour les variables d'environnement
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },

  // Configuration pour les images
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },

  // Configuration pour le build
  output: 'standalone',
  
  // Gestion des fichiers statiques
  trailingSlash: false,
  
  // Configuration TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Configuration ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
