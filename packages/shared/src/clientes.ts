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

// Respuesta de registro que incluye el token para acceder a la tarjeta de socio.
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
};

// POST /api/clientes/consultar-socio
export type ConsultaSocioRequest = {
  contacto: string;
};

