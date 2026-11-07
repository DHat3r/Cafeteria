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
    <p className={`flex items-center gap-2 text-sm ${online ? "text-hoja" : "text-alerta"}`}>
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      API: {online ? "en línea" : "sin conexión"}
    </p>
  );
}
