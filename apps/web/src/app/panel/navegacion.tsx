"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/panel", texto: "Resumen" },
  { href: "/panel/clientes", texto: "Clientes" },
  { href: "/panel/importar", texto: "Importar ventas" },
  { href: "/panel/ofertas", texto: "Ofertas" },
];

// Es de cliente solo para saber qué sección está abierta y marcarla (aria-current).
export function Navegacion() {
  const ruta = usePathname();

  return (
    <nav aria-label="Principal" className="flex gap-1 overflow-x-auto lg:flex-col">
      {ENLACES.map(({ href, texto }) => {
        const activa = ruta === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activa ? "bg-cereza-tenue text-cereza" : "text-tinta-suave hover:bg-superficie-2 hover:text-tinta"
            }`}
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
