// GET /api/dashboard?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (admin)
// Los montos están en pesos (enteros) y las fechas en formato YYYY-MM-DD.
export type VentasDelDia = {
  fecha: string;
  monto: number;
  cantidad: number;
};

export type ProductoTop = {
  producto: string;
  unidades: number;
  monto: number;
};

export type ClienteTop = {
  clienteId: number;
  nombre: string;
  compras: number;
  monto: number;
};

export type Dashboard = {
  desde: string;
  hasta: string;
  totalVentas: number;
  cantidadVentas: number;
  ticketPromedio: number;
  // Porcentaje (0 a 100) de ventas asociadas a un cliente registrado.
  porcentajeAsociado: number;
  // Un elemento por cada día del rango, con ceros si no hubo ventas.
  ventasPorDia: VentasDelDia[];
  topProductos: ProductoTop[];
  topClientes: ClienteTop[];
};
