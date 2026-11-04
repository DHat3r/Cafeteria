// A quién se le envía una oferta: clientes sin baja que, en los últimos `dias`
// días, compraron `producto` (si viene) al menos `minCompras` veces.
// Con minCompras = 0 entran todos los clientes sin baja.
export type Segmento = {
  producto?: string;
  minCompras: number;
  dias: number;
};

// POST /api/ofertas/vista-previa (admin)
export type VistaPreviaRequest = {
  segmento: Segmento;
};

export type VistaPreviaResponse = {
  destinatarios: number;
};

// POST /api/ofertas (admin)
export type CrearOfertaRequest = {
  asunto: string;
  mensaje: string;
  segmento: Segmento;
};

// Respuesta de POST /api/ofertas y de GET /api/ofertas (admin)
export type OfertaResumen = {
  id: number;
  asunto: string;
  mensaje: string;
  segmento: Segmento;
  enviados: number;
  fallidos: number;
  creadoEn: string;
};
