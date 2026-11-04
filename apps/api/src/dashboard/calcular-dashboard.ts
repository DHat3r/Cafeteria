// Cálculo del dashboard a partir de las ventas ya cargadas. Es una función pura:
// no consulta la base de datos ni la hora actual, así que se puede probar con datos fijos.
import type { Dashboard, ClienteTop, ProductoTop, VentasDelDia } from '@cafeteria/shared';

export type VentaParaDashboard = {
  fecha: Date;
  producto: string;
  cantidad: number;
  monto: number;
  clienteId: number | null;
};

const MILISEGUNDOS_POR_DIA = 86400000;
const MAXIMO_TOP = 5;

// Día de la venta en formato YYYY-MM-DD. Las fechas se guardan como "hora de pared" en UTC,
// así que la parte UTC ya es el día correcto.
function diaDe(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

// Milisegundos UTC de medianoche de una fecha YYYY-MM-DD.
function aMilisegundosUTC(fechaIso: string): number {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia);
}

// Todos los días entre desde y hasta, ambos incluidos. Se suman 24 h en UTC para no
// depender de la zona horaria del servidor. Si hasta es anterior, la lista queda vacía.
function diasDelRango(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  const fin = aMilisegundosUTC(hasta);
  for (let momento = aMilisegundosUTC(desde); momento <= fin; momento += MILISEGUNDOS_POR_DIA) {
    dias.push(new Date(momento).toISOString().slice(0, 10));
  }
  return dias;
}

// Un registro por cada día del rango, con ceros si no hubo ventas. Las ventas fuera
// del rango no tienen registro, así que se ignoran aquí.
function calcularVentasPorDia(ventas: VentaParaDashboard[], desde: string, hasta: string): VentasDelDia[] {
  const porDia = new Map<string, VentasDelDia>();
  for (const dia of diasDelRango(desde, hasta)) {
    porDia.set(dia, { fecha: dia, monto: 0, cantidad: 0 });
  }

  for (const venta of ventas) {
    const registro = porDia.get(diaDe(venta.fecha));
    if (!registro) continue;
    registro.monto += venta.monto;
    registro.cantidad += 1;
  }

  return [...porDia.values()];
}

// Agrupa sin distinguir mayúsculas ni espacios en los bordes: 'Latte', ' latte ' y 'LATTE'
// son el mismo producto. El nombre que se muestra es el de la primera aparición.
function calcularTopProductos(ventas: VentaParaDashboard[]): ProductoTop[] {
  const porProducto = new Map<string, ProductoTop>();
  for (const venta of ventas) {
    const clave = venta.producto.trim().toLowerCase();
    const acumulado = porProducto.get(clave) ?? { producto: venta.producto.trim(), unidades: 0, monto: 0 };
    acumulado.unidades += venta.cantidad;
    acumulado.monto += venta.monto;
    porProducto.set(clave, acumulado);
  }

  return [...porProducto.values()]
    .sort((a, b) => b.monto - a.monto || a.producto.localeCompare(b.producto))
    .slice(0, MAXIMO_TOP);
}

// Solo cuentan las ventas con cliente registrado.
function calcularTopClientes(ventas: VentaParaDashboard[], nombresClientes: Map<number, string>): ClienteTop[] {
  const porCliente = new Map<number, ClienteTop>();
  for (const venta of ventas) {
    if (venta.clienteId === null) continue;
    const acumulado = porCliente.get(venta.clienteId) ?? {
      clienteId: venta.clienteId,
      nombre: nombresClientes.get(venta.clienteId) ?? 'Cliente',
      compras: 0,
      monto: 0,
    };
    acumulado.compras += 1;
    acumulado.monto += venta.monto;
    porCliente.set(venta.clienteId, acumulado);
  }

  return [...porCliente.values()]
    .sort((a, b) => b.monto - a.monto || b.compras - a.compras || a.clienteId - b.clienteId)
    .slice(0, MAXIMO_TOP);
}

// Las ventas ya vienen filtradas por el rango de fechas en los totales; el rango solo
// decide qué días aparecen en ventasPorDia.
export function calcularDashboard(
  ventas: VentaParaDashboard[],
  nombresClientes: Map<number, string>,
  desde: string,
  hasta: string,
): Dashboard {
  const cantidadVentas = ventas.length;
  const totalVentas = ventas.reduce((suma, venta) => suma + venta.monto, 0);
  const ventasConCliente = ventas.filter((venta) => venta.clienteId !== null).length;

  return {
    desde,
    hasta,
    totalVentas,
    cantidadVentas,
    ticketPromedio: cantidadVentas === 0 ? 0 : Math.round(totalVentas / cantidadVentas),
    porcentajeAsociado: cantidadVentas === 0 ? 0 : Math.round((100 * ventasConCliente) / cantidadVentas),
    ventasPorDia: calcularVentasPorDia(ventas, desde, hasta),
    topProductos: calcularTopProductos(ventas),
    topClientes: calcularTopClientes(ventas, nombresClientes),
  };
}
