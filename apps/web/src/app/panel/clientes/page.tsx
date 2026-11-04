import QRCode from "qrcode";
import type { ClienteResumen } from "@cafeteria/shared";
import { Mensaje, Tarjeta, pesos } from "@/components/ui";
import { ApiError, apiGet } from "@/lib/api";

// Fecha ISO a "dd-mm-aaaa". Se formatea en UTC para que el día no cambie según la zona horaria.
function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { timeZone: "UTC" });
}

export default async function PaginaClientes() {
  // El QR apunta al formulario de registro público del frontend.
  const url = `${process.env.PUBLIC_WEB_URL ?? "http://localhost:3000"}/registro`;
  // El SVG lo genera la librería qrcode a partir de nuestra propia URL, no de datos del usuario.
  const svgQr = await QRCode.toString(url, { type: "svg", margin: 1, width: 220 });

  let clientes: ClienteResumen[] | null = null;
  let errorApi: string | null = null;
  try {
    clientes = await apiGet<ClienteResumen[]>("/clientes");
  } catch (error) {
    // Solo se muestran los errores de la API. Cualquier otro error se relanza,
    // así funcionan las redirecciones al login.
    if (!(error instanceof ApiError)) throw error;
    errorApi = error.message;
  }

  return (
    <>
      <Tarjeta titulo="Registro por QR">
        <div className="flex flex-wrap items-center gap-6">
          {/* Es seguro usar dangerouslySetInnerHTML aquí: el contenido es un SVG generado por la librería a partir de nuestra propia URL. */}
          <div role="img" aria-label="Código QR para registrarse" dangerouslySetInnerHTML={{ __html: svgQr }} />
          <div className="flex flex-col gap-2 text-sm">
            <p className="break-all font-mono">{url}</p>
            <p>
              Imprímelo y ponlo en el mostrador (Ctrl+P). Los clientes que lo escaneen quedan registrados con su
              consentimiento.
            </p>
          </div>
        </div>
      </Tarjeta>

      {errorApi && <Mensaje ok={false}>{errorApi}</Mensaje>}

      {clientes && (
        <Tarjeta titulo={`Clientes (${clientes.length})`}>
          {clientes.length === 0 ? (
            <p className="text-sm">Aún no hay clientes registrados. Comparte el QR para empezar.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Nombre
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Correo
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Teléfono
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Registrado
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        Compras
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        Monto
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Última compra
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((cliente) => (
                      <tr key={cliente.id} className="border-b border-zinc-100 dark:border-zinc-900">
                        <td className="py-2 pr-4">{cliente.nombre}</td>
                        <td className="py-2 pr-4">{cliente.correo ?? "—"}</td>
                        <td className="py-2 pr-4">{cliente.telefono ?? "—"}</td>
                        <td className="py-2 pr-4">{formatearFecha(cliente.registradoEn)}</td>
                        <td className="py-2 pr-4 text-right">{cliente.compras}</td>
                        <td className="py-2 pr-4 text-right">{pesos(cliente.montoTotal)}</td>
                        <td className="py-2 pr-4">
                          {cliente.ultimaCompra ? formatearFecha(cliente.ultimaCompra) : "—"}
                        </td>
                        <td className="py-2">{cliente.dadoDeBaja ? "De baja" : "Activo"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Los correos y teléfonos se guardan cifrados; aquí se muestran solo para el administrador.
              </p>
            </>
          )}
        </Tarjeta>
      )}
    </>
  );
}
