import type { Segmento } from '@cafeteria/shared';

const MILISEGUNDOS_POR_DIA = 86400000;

// Lo que el filtro necesita saber de un cliente: si está dado de baja y sus compras.
export type ClienteSegmentable = {
  bajaEn: Date | null;
  compras: { fecha: Date; producto: string }[];
};

// Deja solo los clientes que caen en el segmento, en el mismo orden y como los mismos objetos.
// La hora actual llega por parámetro para que la función sea pura y se pueda probar.
export function filtrarSegmento<T extends ClienteSegmentable>(clientes: T[], segmento: Segmento, ahora: Date): T[] {
  return clientes.filter((cliente) => cumpleSegmento(cliente, segmento, ahora));
}

function cumpleSegmento(cliente: ClienteSegmentable, segmento: Segmento, ahora: Date): boolean {
  // Un cliente dado de baja nunca recibe ofertas, aunque cumpla el segmento.
  if (cliente.bajaEn !== null) return false;
  if (segmento.minCompras <= 0) return true;

  const desde = ahora.getTime() - segmento.dias * MILISEGUNDOS_POR_DIA;
  // Un producto vacío tras recortar espacios equivale a no filtrar por producto.
  const producto = segmento.producto?.trim().toLowerCase() ?? '';
  const comprasEnSegmento = cliente.compras.filter((compra) => {
    const momento = compra.fecha.getTime();
    if (momento < desde || momento > ahora.getTime()) return false;
    return producto === '' || compra.producto.trim().toLowerCase() === producto;
  });

  return comprasEnSegmento.length >= segmento.minCompras;
}
