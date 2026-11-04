import { Tarjeta } from "@/components/ui";
import { FormularioLogin } from "./formulario";

export default async function PaginaLogin({ searchParams }: PageProps<"/login">) {
  const { expirada } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Panel de la cafetería</h1>
      <Tarjeta>
        <FormularioLogin expirada={expirada === "1"} />
      </Tarjeta>
    </main>
  );
}
