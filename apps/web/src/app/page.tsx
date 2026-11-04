import Link from "next/link";
import { Suspense } from "react";
import { ApiStatus } from "./api-status";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold">Cafetería</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Importa las ventas del día, conoce a tus clientes y envíales ofertas.
      </p>
      <nav aria-label="Accesos" className="flex gap-4 text-sm font-medium">
        <Link href="/panel" className="underline">
          Ir al panel
        </Link>
        <Link href="/registro" className="underline">
          Registro de clientes
        </Link>
      </nav>
      {/* El estado se pide en cada visita; Suspense muestra el texto de espera mientras tanto. */}
      <Suspense fallback={<p className="text-zinc-500">API: revisando…</p>}>
        <ApiStatus />
      </Suspense>
    </main>
  );
}
