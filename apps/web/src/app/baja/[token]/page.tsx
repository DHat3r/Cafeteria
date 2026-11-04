import { Tarjeta } from "@/components/ui";
import { FormularioBaja } from "./formulario";

export const metadata = { title: "Darse de baja | Cafetería" };

export default async function PaginaBaja({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Dejar de recibir ofertas</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Si confirmas, no volverás a recibir ofertas por correo.
        </p>
      </div>
      <Tarjeta>
        <FormularioBaja token={token} />
      </Tarjeta>
    </main>
  );
}
