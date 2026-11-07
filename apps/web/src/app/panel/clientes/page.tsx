import QRCode from "qrcode";
import type { ClienteResumen } from "@cafeteria/shared";
import { Mensaje, Tabla, Tarjeta, Titulo, pesos } from "@/components/ui";
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
      <Titulo bajada="Quienes se registraron con el QR y cuánto han comprado.">Clientes</Titulo>

      <Tarjeta titulo="Registro por QR">
        <div className="flex flex-wrap items-center gap-6">
          {/* Es seguro usar dangerouslySetInnerHTML aquí: el contenido es un SVG generado por la librería a partir de nuestra propia URL. */}
          <div
            role="img"
            aria-label="Código QR para registrarse"
            className="rounded-xl bg-white p-2"
            dangerouslySetInnerHTML={{ __html: svgQr }}
          />
          <div className="flex max-w-[52ch] flex-col gap-2 text-sm">
            <p className="break-all font-semibold text-cereza">{url}</p>
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
              <Tabla>
                <thead>
                  <tr>
                    <th scope="col">Nombre</th>
                    <th scope="col">Correo</th>
                    <th scope="col">Teléfono</th>
                    <th scope="col">Registrado</th>
                    <th scope="col" className="num">
                      Compras
                    </th>
                    <th scope="col" className="num">
                      Monto
                    </th>
                    <th scope="col">Última compra</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>{cliente.nombre}</td>
                      <td>{cliente.correo ?? "—"}</td>
                      <td>{cliente.telefono ?? "—"}</td>
                      <td>{formatearFecha(cliente.registradoEn)}</td>
                      <td className="num">{cliente.compras}</td>
                      <td className="num">{pesos(cliente.montoTotal)}</td>
                      <td>{cliente.ultimaCompra ? formatearFecha(cliente.ultimaCompra) : "—"}</td>
                      <td>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            cliente.dadoDeBaja ? "bg-superficie-2 text-tinta-suave" : "bg-hoja-tenue text-hoja"
                          }`}
                        >
                          {cliente.dadoDeBaja ? "De baja" : "Activo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
              <p className="mt-3 text-xs text-tinta-suave">
                Los correos y teléfonos se guardan cifrados; aquí se muestran solo para el administrador.
              </p>
            </>
          )}
        </Tarjeta>
      )}
    </>
  );
}
