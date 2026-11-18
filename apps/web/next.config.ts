import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Subir el Excel de ventas (hasta 5 MB) pasa por un Server Action;
    // el límite por defecto es 1 MB.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
