import type { HealthResponse } from "@cafeteria/shared";

// La URL de la API viene de una variable de entorno, nunca escrita a mano
// (en LinkUDP hubo varios commits arreglando URLs localhost).
const apiUrl = process.env.API_URL ?? "http://localhost:3001";

async function fetchHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${apiUrl}/api/health`, { cache: "no-store" });
    return res.ok ? ((await res.json()) as HealthResponse) : null;
  } catch {
    return null;
  }
}

export async function ApiStatus() {
  const health = await fetchHealth();
  const online = health?.status === "ok";

  return (
    <p className={online ? "text-green-700" : "text-red-700"}>
      API: {online ? "en línea" : "sin conexión"}
    </p>
  );
}
