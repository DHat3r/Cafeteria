import type { OfertaResumen, Segmento } from "@cafeteria/shared";
import { Mensaje, Tarjeta } from "@/components/ui";
import { ApiError, apiGet } from "@/lib/api";
import { Formulario } from "./formulario";

function describirSegmento({ producto, minCompras, dias }: Segmento): string {
  if (minCompras === 0) return "Todos los clientes";
  return `${minCompras}+ compras${producto ? ` de ${producto}` : ""} en ${dias} días`;
}

export default async function PaginaOfertas() {
  let ofertas: OfertaResumen[] = [];
  let errorCarga: string | null = null;

  try {
    ofertas = await apiGet<OfertaResumen[]>("/ofertas");
  } catch (error) {
    // Un error de la API se muestra en pantalla; cualquier otro (por ejemplo una redirección) sigue su curso.
    if (!(error instanceof ApiError)) throw error;
    errorCarga = error.message;
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Ofertas por correo</h1>

      <Tarjeta>
        <Formulario />
      </Tarjeta>

      <Tarjeta titulo="Ofertas enviadas">
        {errorCarga && <Mensaje ok={false}>{errorCarga}</Mensaje>}
        {!errorCarga && ofertas.length === 0 && <p className="text-sm text-zinc-500">Aún no has enviado ofertas.</p>}
        {!errorCarga && ofertas.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-3 py-2 font-medium">Asunto</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Segmento</th>
                  <th className="px-3 py-2 font-medium">Enviados</th>
                  <th className="px-3 py-2 font-medium">Fallidos</th>
                </tr>
              </thead>
              <tbody>
                {ofertas.map((oferta) => (
                  <tr key={oferta.id} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-3 py-2">{oferta.asunto}</td>
                    <td className="px-3 py-2">{new Date(oferta.creadoEn).toLocaleString("es-CL")}</td>
                    <td className="px-3 py-2">{describirSegmento(oferta.segmento)}</td>
                    <td className="px-3 py-2">{oferta.enviados}</td>
                    <td className="px-3 py-2">{oferta.fallidos}</td>
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
