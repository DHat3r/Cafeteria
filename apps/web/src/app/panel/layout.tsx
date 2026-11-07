import Link from "next/link";
import { redirect } from "next/navigation";
import { Boton, GranoCafe } from "@/components/ui";
import { obtenerToken } from "@/lib/sesion";
import { cerrarSesion } from "../login/acciones";
import { Navegacion } from "./navegacion";

export default async function LayoutPanel({ children }: LayoutProps<"/panel">) {
  // Segunda barrera (la primera es proxy.ts): el panel no se renderiza sin sesión.
  if (!(await obtenerToken())) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-4 sm:px-6 lg:flex-row lg:gap-10 lg:py-8">
      <aside className="flex flex-col gap-4 border-b border-linea pb-4 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] lg:w-52 lg:shrink-0 lg:border-b-0 lg:pb-0">
        <div className="flex items-center justify-between gap-3">
          <Link href="/panel" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-full bg-relleno text-white">
              <GranoCafe className="size-4" />
            </span>
            Cafetería
          </Link>
          <form action={cerrarSesion} className="lg:hidden">
            <Boton type="submit" variante="secundario" className="px-4 py-1.5">
              Salir
            </Boton>
          </form>
        </div>
        <Navegacion />
        <form action={cerrarSesion} className="mt-auto hidden lg:block">
          <Boton type="submit" variante="secundario" className="w-full">
            Cerrar sesión
          </Boton>
        </form>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-6">{children}</main>
    </div>
  );
}
