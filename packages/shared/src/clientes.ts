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

// Respuesta del registro. `token` (el de la tarjeta de socio) solo viene cuando el cliente se acaba de crear:
// a quien se registra con un contacto que ya existía nunca se le entrega, porque no prueba que sea suyo.
export type RegistroClienteResponse = {
  mensaje: string;
  token?: string;
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

export type CompraSocioResumen = {
  fecha: string;
  producto: string;
  cantidad: number;
  monto: number;
};

export type OfertaSocioResumen = {
  id: number;
  asunto: string;
  mensaje: string;
  creadoEn: string;
};

// GET /api/clientes/socio/:token (público, portal del cliente)
export type SocioPerfilResponse = {
  nombre: string;
  identificador: string;
  correo: string | null;
  telefono: string | null;
  registradoEn: string;
  puntos: number;
  totalCompras: number;
  montoTotal: number;
  proximaRecompensaPuntos: number;
  ofertas: OfertaSocioResumen[];
  ultimasCompras: CompraSocioResumen[];
  // Para el enlace "darte de baja" de la tarjeta: el token de la tarjeta no sirve en /baja.
  tokenBaja: string;
};

// POST /api/clientes/consultar-socio: responde siempre MensajeResponse, exista o no el contacto.
export type ConsultaSocioRequest = {
  contacto: string;
};

