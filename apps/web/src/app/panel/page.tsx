import type { Dashboard, VentasDelDia } from "@cafeteria/shared";
import { Boton, Campo, Mensaje, Tabla, Tarjeta, Titulo, pesos } from "@/components/ui";
import { ApiError, apiGet } from "@/lib/api";

// Alto del gráfico en píxeles: la barra del día con más ventas ocupa todo el alto.
const ALTO_GRAFICO = 200;
// Con más días que esto, solo se muestran las etiquetas de la primera y la última fecha.
const MAX_DIAS_CON_ETIQUETAS = 14;

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

function Cifras({ dashboard }: { dashboard: Dashboard }) {
  const apoyo = [
    { etiqueta: "N° de ventas", valor: String(dashboard.cantidadVentas) },
    { etiqueta: "Ticket promedio", valor: pesos(dashboard.ticketPromedio) },
    { etiqueta: "Con cliente registrado", valor: `${dashboard.porcentajeAsociado}%` },
  ];

  return (
    <section className="grid gap-6 rounded-2xl border border-linea bg-superficie p-6 lg:grid-cols-[1.4fr_2fr] lg:items-end">
      <div>
        <p className="text-sm text-tinta-suave">Ventas totales</p>
        <p className="mt-1 text-5xl font-bold tracking-tight text-cereza">{pesos(dashboard.totalVentas)}</p>
      </div>
      <dl className="grid grid-cols-3 gap-4 border-t border-linea pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        {apoyo.map(({ etiqueta, valor }) => (
          <div key={etiqueta}>
            <dt className="text-xs text-tinta-suave sm:text-sm">{etiqueta}</dt>
            <dd className="mt-1 text-xl font-semibold sm:text-2xl">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
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
                  className="w-full rounded-t-md bg-cereza transition-colors hover:bg-cereza-fuerte"
                  style={{ height: `${alturaBarra(dia, montoMaximo)}px` }}
                  title={`${formatearFecha(dia.fecha)}: ${pesos(dia.monto)}`}
                />
              </div>
              <span
                className={`h-4 whitespace-nowrap text-[10px] text-tinta-suave ${
                  indice === 0 ? "self-start" : indice === ultimoIndice ? "self-end" : ""
                }`}
              >
                {mostrarEtiqueta ? fechaCorta(dia.fecha) : ""}
              </span>
            </div>
          );
        })}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-tinta-suave hover:text-tinta">Ver tabla</summary>
        <div className="mt-3">
          <Tabla>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col" className="num">
                  Ventas
                </th>
                <th scope="col" className="num">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {dias.map((dia) => (
                <tr key={dia.fecha}>
                  <td>{formatearFecha(dia.fecha)}</td>
                  <td className="num">{dia.cantidad}</td>
                  <td className="num">{pesos(dia.monto)}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Titulo bajada="Cómo van las ventas en el rango elegido.">Resumen</Titulo>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Desde" name="desde" type="date" defaultValue={dashboard?.desde ?? desde} />
          <Campo etiqueta="Hasta" name="hasta" type="date" defaultValue={dashboard?.hasta ?? hasta} />
          <Boton type="submit">Ver</Boton>
        </form>
      </div>

      {errorApi && <Mensaje ok={false}>{errorApi}</Mensaje>}

      {dashboard && (
        <>
          <Cifras dashboard={dashboard} />

          {dashboard.cantidadVentas === 0 ? (
            <Tarjeta>
              <p className="text-sm">
                Todavía no hay ventas en este rango. Importa el Excel del día en «Importar ventas».
              </p>
            </Tarjeta>
          ) : (
            <>
              <GraficoVentasPorDia dias={dashboard.ventasPorDia} />

              <div className="grid gap-6 xl:grid-cols-2">
                <Tarjeta titulo="Productos más vendidos">
                  <Tabla>
                    <thead>
                      <tr>
                        <th scope="col">Producto</th>
                        <th scope="col" className="num">
                          Unidades
                        </th>
                        <th scope="col" className="num">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topProductos.map((producto) => (
                        <tr key={producto.producto}>
                          <td>{producto.producto}</td>
                          <td className="num">{producto.unidades}</td>
                          <td className="num">{pesos(producto.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Tabla>
                </Tarjeta>

                <Tarjeta titulo="Mejores clientes">
                  <Tabla>
                    <thead>
                      <tr>
                        <th scope="col">Nombre</th>
                        <th scope="col" className="num">
                          Compras
                        </th>
                        <th scope="col" className="num">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topClientes.map((cliente) => (
                        <tr key={cliente.clienteId}>
                          <td>{cliente.nombre}</td>
                          <td className="num">{cliente.compras}</td>
                          <td className="num">{pesos(cliente.monto)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Tabla>
                </Tarjeta>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
