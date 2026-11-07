import type { ResumenImportacion } from "@cafeteria/shared";
import { Mensaje, Tabla, Tarjeta, Titulo } from "@/components/ui";
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
      <Titulo bajada="Sube el Excel de la caja; revisas las columnas antes de guardar nada.">
        Importar ventas del día
      </Titulo>

      <Tarjeta>
        <Importador />
      </Tarjeta>

      <Tarjeta titulo="Importaciones anteriores">
        {errorCarga && <Mensaje ok={false}>{errorCarga}</Mensaje>}
        {!errorCarga && importaciones.length === 0 && (
          <p className="text-sm text-tinta-suave">Aún no has importado ventas.</p>
        )}
        {!errorCarga && importaciones.length > 0 && (
          <Tabla>
            <thead>
              <tr>
                <th scope="col">Archivo</th>
                <th scope="col">Fecha</th>
                <th scope="col" className="num">
                  Importadas
                </th>
                <th scope="col" className="num">
                  Duplicadas
                </th>
                <th scope="col" className="num">
                  Con error
                </th>
                <th scope="col" className="num">
                  Asociadas
                </th>
              </tr>
            </thead>
            <tbody>
              {importaciones.map((importacion) => (
                <tr key={importacion.id}>
                  <td>{importacion.archivo}</td>
                  <td>{new Date(importacion.creadoEn).toLocaleString("es-CL")}</td>
                  <td className="num">{importacion.importadas}</td>
                  <td className="num">{importacion.duplicadas}</td>
                  <td className="num">{importacion.conError}</td>
                  <td className="num">{importacion.asociadas}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </>
  );
}
