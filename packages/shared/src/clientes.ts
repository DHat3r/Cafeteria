// POST /api/clientes/registro (público, desde el QR)
export type RegistroClienteRequest = {
  nombre: string;
  correo?: string;
  telefono?: string;
  consentimiento: true;
};

// Respuesta genérica de las rutas públicas.
export type MensajeResponse = {
  mensaje: string;
};

// GET /api/clientes (admin). Fechas en ISO 8601.
export type ClienteResumen = {
  id: number;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  registradoEn: string;
  dadoDeBaja: boolean;
  compras: number;
  montoTotal: number;
  ultimaCompra: string | null;
};
