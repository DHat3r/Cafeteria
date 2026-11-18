import { GranoCafe, Tarjeta } from "@/components/ui";
import { FormularioLogin } from "./formulario";

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { expirada } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center gap-3">
        <img
          src="/logo-abril.png"
          alt="Abril 1781"
          className="size-12 rounded-full object-cover shadow-sm border border-linea"
        />
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-tinta">Abril · 1781</h1>
          <span className="text-xs uppercase tracking-wider text-tinta-suave">Administración Cafetería</span>
        </div>
      </div>
      <Tarjeta>
        <FormularioLogin expirada={expirada === "1"} />
      </Tarjeta>
    </main>
  );
}
