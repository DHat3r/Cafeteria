import type { ComponentProps, ReactNode } from "react";

// Piezas de interfaz compartidas por todas las páginas, para que se vean consistentes.
// Son componentes sin estado, así que sirven tanto en servidor como en cliente.

export function Tarjeta({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {titulo && <h2 className="mb-3 text-lg font-semibold">{titulo}</h2>}
      {children}
    </section>
  );
}

export function Boton({ className = "", ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800 disabled:opacity-50 ${className}`}
    />
  );
}

export function Campo({ etiqueta, ayuda, ...props }: ComponentProps<"input"> & { etiqueta: string; ayuda?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{etiqueta}</span>
      <input
        {...props}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      {ayuda && <span className="text-xs text-zinc-500">{ayuda}</span>}
    </label>
  );
}

// Resultado de una acción: verde si salió bien, rojo si falló. role="status"/"alert"
// hace que los lectores de pantalla lo anuncien.
export function Mensaje({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`rounded-lg px-3 py-2 text-sm ${
        ok
          ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
          : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
      }`}
    >
      {children}
    </p>
  );
}

// Resultado que devuelven los Server Actions a los formularios.
export type EstadoAccion = { ok: boolean; mensaje: string } | null;

export const pesos = (monto: number) => `$${monto.toLocaleString("es-CL")}`;
