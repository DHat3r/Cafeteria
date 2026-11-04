import { Tarjeta } from "@/components/ui";
import { FormularioRegistro } from "./formulario";

export const metadata = { title: "Recibe ofertas | Cafetería" };

// Página pública: el cliente la abre desde el QR en su celular, así que no exige sesión.
export default function PaginaRegistro() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Recibe nuestras ofertas</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Regístrate y te enviaremos promociones pensadas para ti.
        </p>
      </div>
      <Tarjeta>
        <FormularioRegistro />
      </Tarjeta>
    </main>
  );
}
