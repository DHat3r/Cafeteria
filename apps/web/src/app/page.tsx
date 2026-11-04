import { Suspense } from "react";
import { ApiStatus } from "./api-status";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold">Cafetería</h1>
      <p className="text-zinc-600">
        Importa las ventas del día, conoce a tus clientes y envíales ofertas.
      </p>
      {/* El estado se pide en cada visita; Suspense muestra el texto de espera mientras tanto. */}
      <Suspense fallback={<p className="text-zinc-500">API: revisando…</p>}>
        <ApiStatus />
      </Suspense>
    </main>
  );
}
