// Qué columna del archivo corresponde a cada campo de una venta.
// Los valores son los textos de los encabezados del Excel.
export type MapeoColumnas = {
  fecha: string;
  producto: string;
  monto: string;
  cantidad?: string;
  correo?: string;
  telefono?: string;
  idExterno?: string;
};

// POST /api/importaciones/encabezados (admin, multipart "archivo")
export type EncabezadosExcel = {
  encabezados: string[];
  // Primeras filas, como texto, para que el admin reconozca cada columna.
  muestra: Record<string, string>[];
  mapeoGuardado: MapeoColumnas | null;
};

export type ErrorFila = {
  fila: number;
  motivo: string;
};

// POST /api/importaciones (admin, multipart "archivo" + "mapeo" en JSON) y GET /api/importaciones
export type ResumenImportacion = {
  id: number;
  archivo: string;
  creadoEn: string;
  filasLeidas: number;
  importadas: number;
  duplicadas: number;
  conError: number;
  asociadas: number;
  // Solo en la respuesta del POST: los primeros 50 errores.
  errores?: ErrorFila[];
};
