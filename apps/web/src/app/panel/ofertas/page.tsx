import type { OfertaResumen, Segmento } from "@cafeteria/shared";
import { Mensaje, Tabla, Tarjeta, Titulo } from "@/components/ui";
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
      <Titulo bajada="Escribe la oferta, elige a quién va y revisa cuántos la recibirán antes de enviarla.">
        Ofertas por correo
      </Titulo>

      <Tarjeta>
        <Formulario />
      </Tarjeta>

      <Tarjeta titulo="Ofertas enviadas">
        {errorCarga && <Mensaje ok={false}>{errorCarga}</Mensaje>}
        {!errorCarga && ofertas.length === 0 && <p className="text-sm text-tinta-suave">Aún no has enviado ofertas.</p>}
        {!errorCarga && ofertas.length > 0 && (
          <Tabla>
            <thead>
              <tr>
                <th scope="col">Asunto</th>
                <th scope="col">Fecha</th>
                <th scope="col">Segmento</th>
                <th scope="col" className="num">
                  Enviados
                </th>
                <th scope="col" className="num">
                  Fallidos
                </th>
              </tr>
            </thead>
            <tbody>
              {ofertas.map((oferta) => (
                <tr key={oferta.id}>
                  <td className="ajustar">{oferta.asunto}</td>
                  <td>{new Date(oferta.creadoEn).toLocaleString("es-CL")}</td>
                  <td>{describirSegmento(oferta.segmento)}</td>
                  <td className="num">{oferta.enviados}</td>
                  <td className="num">{oferta.fallidos}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </Tarjeta>
    </>
  );
}
