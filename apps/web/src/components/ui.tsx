import type { ComponentProps, ReactNode } from "react";

// Piezas de interfaz compartidas por todas las páginas, para que se vean consistentes.
// Son componentes sin estado, así que sirven tanto en servidor como en cliente.
// Los colores salen de los tokens de globals.css (porcelana, tinta, cereza…).

export function Tarjeta({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-linea bg-superficie p-5 sm:p-6">
      {titulo && <h2 className="mb-4 text-lg font-semibold tracking-tight">{titulo}</h2>}
      {children}
    </section>
  );
}

export function Titulo({ children, bajada }: { children: ReactNode; bajada?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl font-bold tracking-tight">{children}</h1>
      {bajada && <p className="text-tinta-suave">{bajada}</p>}
    </div>
  );
}

const variantesBoton = {
  principal: "bg-relleno text-white hover:bg-relleno-hover",
  secundario: "border border-linea bg-superficie text-tinta hover:bg-superficie-2",
};

export function Boton({
  className = "",
  variante = "principal",
  ...props
}: ComponentProps<"button"> & { variante?: keyof typeof variantesBoton }) {
  return (
    <button
      {...props}
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${variantesBoton[variante]} ${className}`}
    />
  );
}

// Estilo común de input, select y textarea.
export const estiloCampo =
  "rounded-xl border border-linea bg-superficie px-3 py-2 text-base text-tinta placeholder:text-tinta-suave focus:border-cereza";

export function Campo({ etiqueta, ayuda, ...props }: ComponentProps<"input"> & { etiqueta: string; ayuda?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{etiqueta}</span>
      <input {...props} className={estiloCampo} />
      {ayuda && <span className="text-xs text-tinta-suave">{ayuda}</span>}
    </label>
  );
}

// Resultado de una acción: verde si salió bien, rojo si falló. role="status"/"alert"
// hace que los lectores de pantalla lo anuncien.
export function Mensaje({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`rounded-xl px-4 py-3 text-sm ${ok ? "bg-hoja-tenue text-hoja" : "bg-alerta-tenue text-alerta"}`}
    >
      {children}
    </p>
  );
}

// Tabla con scroll horizontal en pantallas chicas; el estilo de celdas está en globals.css (.tabla).
export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="tabla">{children}</table>
    </div>
  );
}

// Tarjeta de fidelidad: la usan las páginas públicas (registro por QR y baja).
export function TarjetaFidelidad({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="troquel overflow-hidden rounded-3xl bg-superficie shadow-[0_1px_0_var(--linea),0_20px_40px_-24px_rgba(42,28,21,0.35)]">
        <div className="relative bg-relleno px-6 pb-8 pt-9 text-white">
          <Sellos />
          <p className="text-sm font-medium opacity-80">Cafetería</p>
          <h1 className="mt-1 max-w-[16ch] text-3xl font-bold leading-tight tracking-tight">{titulo}</h1>
          <p className="mt-3 max-w-[34ch] text-sm opacity-90">{bajada}</p>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </main>
  );
}

// Fila de sellos de la tarjeta: tres marcados y dos vacíos, como una tarjeta de café real.
function Sellos() {
  return (
    <div aria-hidden="true" className="absolute right-5 top-5 flex gap-1.5">
      {[true, true, true, false, false].map((marcado, indice) => (
        <span
          key={indice}
          className={`grid size-6 place-items-center rounded-full border-2 border-current ${marcado ? "opacity-90" : "opacity-35"}`}
        >
          {marcado && <GranoCafe className="size-3" />}
        </span>
      ))}
    </div>
  );
}

export function GranoCafe({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="12" rx="7.5" ry="10" transform="rotate(30 12 12)" />
      <path
        d="M8.2 19.6c3.4-2.6 4.6-5.2 3.8-7.8-.8-2.6-.4-5.2 3.8-7.8"
        stroke="var(--cereza)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Resultado que devuelven los Server Actions a los formularios.
export type EstadoAccion = { ok: boolean; mensaje: string } | null;

export const pesos = (monto: number) => `$${monto.toLocaleString("es-CL")}`;
