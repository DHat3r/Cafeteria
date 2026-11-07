import Link from "next/link";
import { Suspense } from "react";
import { GranoCafe } from "@/components/ui";
import { ApiStatus } from "./api-status";

const ACCESOS = [
  { href: "/panel", titulo: "Ir al panel", detalle: "Ventas del día, clientes y ofertas." },
  { href: "/registro", titulo: "Registro de clientes", detalle: "Lo que ven tus clientes al escanear el QR." },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-20">
      <div className="flex flex-col gap-4">
        <span className="grid size-12 place-items-center rounded-full bg-relleno text-white">
          <GranoCafe className="size-6" />
        </span>
        <h1 className="max-w-[14ch] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">Cafetería</h1>
        <p className="max-w-[46ch] text-lg text-tinta-suave">
          Importa las ventas del día, conoce a tus clientes y envíales ofertas.
        </p>
      </div>

      <nav aria-label="Accesos" className="flex flex-col divide-y divide-linea border-y border-linea">
        {ACCESOS.map(({ href, titulo, detalle }) => (
          <Link key={href} href={href} className="group flex items-baseline justify-between gap-4 py-5">
            <span className="text-xl font-semibold group-hover:text-cereza">{titulo}</span>
            <span className="text-right text-sm text-tinta-suave">{detalle}</span>
          </Link>
        ))}
      </nav>

      {/* El estado se pide en cada visita; Suspense muestra el texto de espera mientras tanto. */}
      <Suspense fallback={<p className="text-sm text-tinta-suave">API: revisando…</p>}>
        <ApiStatus />
      </Suspense>
    </main>
  );
}
