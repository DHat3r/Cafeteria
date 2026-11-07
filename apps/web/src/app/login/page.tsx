import { GranoCafe, Tarjeta } from "@/components/ui";
import { FormularioLogin } from "./formulario";

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { expirada } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-relleno text-white">
          <GranoCafe className="size-5" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Panel de la cafetería</h1>
      </div>
      <Tarjeta>
        <FormularioLogin expirada={expirada === "1"} />
      </Tarjeta>
    </main>
  );
}
