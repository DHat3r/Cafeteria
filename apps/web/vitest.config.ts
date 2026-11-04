import { defineConfig } from "vitest/config";

// Solo se prueba lógica pura (sin React ni Next); por eso basta el entorno de Node.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { include: ["src/**/*.spec.ts"] },
});
