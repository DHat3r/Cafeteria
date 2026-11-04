import type { Dashboard, VentasDelDia } from "@cafeteria/shared";
import { Boton, Campo, Mensaje, Tarjeta, pesos } from "@/components/ui";
import { ApiError, apiGet } from "@/lib/api";

// Alto del gráfico en píxeles: la barra del día con más ventas ocupa todo el alto.
const ALTO_GRAFICO = 200;
// Con más días que esto, solo se muestran las etiquetas de la primera y la última fecha.
const MAX_DIAS_CON_ETIQUETAS = 31;

// Convierte "YYYY-MM-DD" en "dd-mm-aaaa". Se parte el texto en vez de usar Date
// para no sufrir desfases por zona horaria.
function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}-${mes}-${anio}`;
}

// Etiqueta corta para el gráfico: "dd/mm".
function fechaCorta(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

// Altura de la barra: proporcional al monto máximo, mínimo 2 px si hubo ventas y 0 si no.
function alturaBarra(dia: VentasDelDia, montoMaximo: number): number {
  if (dia.cantidad === 0) return 0;
  const proporcion = montoMaximo > 0 ? dia.monto / montoMaximo : 0;
  return Math.max(2, Math.round(proporcion * ALTO_GRAFICO));
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Tarjeta>
      <p className="text-sm text-zinc-500">{etiqueta}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
    </Tarjeta>
  );
}

function GraficoVentasPorDia({ dias }: { dias: VentasDelDia[] }) {
  const montoMaximo = Math.max(0, ...dias.map((dia) => dia.monto));
  const ultimoIndice = dias.length - 1;
  const mostrarTodasLasEtiquetas = dias.length <= MAX_DIAS_CON_ETIQUETAS;

  return (
    <Tarjeta titulo="Ventas por día">
      {/* El gráfico es visual: la misma información está en la tabla de abajo, por eso se oculta a lectores de pantalla. */}
      <div aria-hidden="true" className="flex items-end gap-1 overflow-x-auto">
        {dias.map((dia, indice) => {
          const mostrarEtiqueta = mostrarTodasLasEtiquetas || indice === 0 || indice === ultimoIndice;
          return (
            <div key={dia.fecha} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex w-full items-end" style={{ height: `${ALTO_GRAFICO}px` }}>
                <div
                  className="w-full rounded-t bg-amber-700"
                  style={{ height: `${alturaBarra(dia, montoMaximo)}px` }}
                  title={`${formatearFecha(dia.fecha)}: ${pesos(dia.monto)}`}
                />
              </div>
              <span className="h-4 text-[10px] text-zinc-500">{mostrarEtiqueta ? fechaCorta(dia.fecha) : ""}</span>
            </div>
          );
        })}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium">Ver tabla</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col" className="py-2 pr-4 font-medium">
                  Fecha
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Ventas
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {dias.map((dia) => (
                <tr key={dia.fecha} className="border-b border-zinc-100 dark:border-zinc-900">
                  <td className="py-2 pr-4">{formatearFecha(dia.fecha)}</td>
                  <td className="py-2 pr-4 text-right">{dia.cantidad}</td>
                  <td className="py-2 text-right">{pesos(dia.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Tarjeta>
  );
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaginaResumen({ searchParams }: Props) {
  const parametros = await searchParams;
  // Solo se usan las fechas que llegan como texto; si llegan como lista, se ignoran.
  const desde = typeof parametros.desde === "string" ? parametros.desde : undefined;
  const hasta = typeof parametros.hasta === "string" ? parametros.hasta : undefined;

  const filtros = new URLSearchParams();
  if (desde) filtros.set("desde", desde);
  if (hasta) filtros.set("hasta", hasta);
  const consulta = filtros.toString() ? `?${filtros.toString()}` : "";

  let dashboard: Dashboard | null = null;
  let errorApi: string | null = null;
  try {
    dashboard = await apiGet<Dashboard>(`/dashboard${consulta}`);
  } catch (error) {
    // Solo se muestran los errores de la API (por ejemplo, un rango inválido).
    // Cualquier otro error se relanza, así funcionan las redirecciones al login.
    if (!(error instanceof ApiError)) throw error;
    errorApi = error.message;
  }

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <Campo etiqueta="Desde" name="desde" type="date" defaultValue={dashboard?.desde ?? desde} />
        <Campo etiqueta="Hasta" name="hasta" type="date" defaultValue={dashboard?.hasta ?? hasta} />
        <Boton type="submit">Ver</Boton>
      </form>

      {errorApi && <Mensaje ok={false}>{errorApi}</Mensaje>}

      {dashboard && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Cifra etiqueta="Ventas totales" valor={pesos(dashboard.totalVentas)} />
            <Cifra etiqueta="N° de ventas" valor={String(dashboard.cantidadVentas)} />
            <Cifra etiqueta="Ticket promedio" valor={pesos(dashboard.ticketPromedio)} />
            <Cifra etiqueta="Ventas con cliente registrado" valor={`${dashboard.porcentajeAsociado}%`} />
          </div>

          {dashboard.cantidadVentas === 0 ? (
            <Tarjeta>
              <p className="text-sm">
                Todavía no hay ventas en este rango. Importa el Excel del día en «Importar ventas».
              </p>
            </Tarjeta>
          ) : (
            <>
              <GraficoVentasPorDia dias={dashboard.ventasPorDia} />

              <Tarjeta titulo="Productos más vendidos">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Producto
                        </th>
                        <th scope="col" className="py-2 pr-4 text-right font-medium">
                          Unidades
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topProductos.map((producto) => (
                        <tr key={producto.producto} className="border-b border-zinc-100 dark:border-zinc-900">
                          <td className="py-2 pr-4">{producto.producto}</td>
                          <td className="py-2 pr-4 text-right">{producto.unidades}</td>
                          <td className="py-2 text-right">{pesos(producto.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tarjeta>

              <Tarjeta titulo="Mejores clientes">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Nombre
                        </th>
                        <th scope="col" className="py-2 pr-4 text-right font-medium">
                          Compras
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topClientes.map((cliente) => (
                        <tr key={cliente.clienteId} className="border-b border-zinc-100 dark:border-zinc-900">
                          <td className="py-2 pr-4">{cliente.nombre}</td>
                          <td className="py-2 pr-4 text-right">{cliente.compras}</td>
                          <td className="py-2 text-right">{pesos(cliente.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tarjeta>
            </>
          )}
        </>
      )}
    </>
  );
}
