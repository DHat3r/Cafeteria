import type { ResumenImportacion } from "@cafeteria/shared";
import { Mensaje, Tarjeta } from "@/components/ui";
import { ApiError, apiGet } from "@/lib/api";
import { Importador } from "./importador";

export default async function PaginaImportar() {
  let importaciones: ResumenImportacion[] = [];
  let errorCarga: string | null = null;

  try {
    importaciones = await apiGet<ResumenImportacion[]>("/importaciones");
  } catch (error) {
    // Un error de la API se muestra en pantalla; cualquier otro (por ejemplo una redirección) sigue su curso.
    if (!(error instanceof ApiError)) throw error;
    errorCarga = error.message;
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Importar ventas del día</h1>

      <Tarjeta>
        <Importador />
      </Tarjeta>

      <Tarjeta titulo="Importaciones anteriores">
        {errorCarga && <Mensaje ok={false}>{errorCarga}</Mensaje>}
        {!errorCarga && importaciones.length === 0 && (
          <p className="text-sm text-zinc-500">Aún no has importado ventas.</p>
        )}
        {!errorCarga && importaciones.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2 font-medium">Archivo</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Importadas</th>
                  <th className="px-3 py-2 font-medium">Duplicadas</th>
                  <th className="px-3 py-2 font-medium">Con error</th>
                  <th className="px-3 py-2 font-medium">Asociadas</th>
                </tr>
              </thead>
              <tbody>
                {importaciones.map((importacion) => (
                  <tr key={importacion.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-2">{importacion.archivo}</td>
                    <td className="px-3 py-2">{new Date(importacion.creadoEn).toLocaleString("es-CL")}</td>
                    <td className="px-3 py-2">{importacion.importadas}</td>
                    <td className="px-3 py-2">{importacion.duplicadas}</td>
                    <td className="px-3 py-2">{importacion.conError}</td>
                    <td className="px-3 py-2">{importacion.asociadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  );
}
