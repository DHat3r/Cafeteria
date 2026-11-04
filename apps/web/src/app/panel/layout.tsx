import Link from "next/link";
import { redirect } from "next/navigation";
import { Boton } from "@/components/ui";
import { obtenerToken } from "@/lib/sesion";
import { cerrarSesion } from "../login/acciones";

const ENLACES = [
  { href: "/panel", texto: "Resumen" },
  { href: "/panel/clientes", texto: "Clientes" },
  { href: "/panel/importar", texto: "Importar ventas" },
  { href: "/panel/ofertas", texto: "Ofertas" },
];

export default async function LayoutPanel({ children }: LayoutProps<"/panel">) {
  // Segunda barrera (la primera es proxy.ts): el panel no se renderiza sin sesión.
  if (!(await obtenerToken())) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <nav aria-label="Principal" className="flex flex-wrap gap-4 text-sm font-medium">
          {ENLACES.map(({ href, texto }) => (
            <Link key={href} href={href} className="hover:underline">
              {texto}
            </Link>
          ))}
        </nav>
        <form action={cerrarSesion}>
          <Boton type="submit" className="bg-zinc-700 hover:bg-zinc-800">
            Cerrar sesión
          </Boton>
        </form>
      </header>
      {children}
    </div>
  );
}
