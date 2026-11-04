import type { ErrorFila, MapeoColumnas } from '@cafeteria/shared';

// Patrón Adapter: cada fuente de ventas (este Excel, un CSV, la API del sistema
// de caja en el futuro) se traduce a VentaNormalizada. El resto del sistema
// (deduplicación, asociación, dashboard) solo conoce este formato.
export type VentaNormalizada = {
  // Fecha y hora "de pared" del local, guardada como UTC sin convertir zonas.
  fecha: Date;
  producto: string;
  cantidad: number;
  monto: number;
  correo: string | null;
  telefono: string | null;
  idExterno: string | null;
};

export type LecturaVentas = {
  filasLeidas: number;
  ventas: { fila: number; venta: VentaNormalizada }[];
  errores: ErrorFila[];
};

export interface FuenteVentas {
  leer(archivo: Buffer, mapeo: MapeoColumnas): Promise<LecturaVentas>;
}
