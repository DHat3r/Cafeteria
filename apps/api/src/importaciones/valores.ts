// Conversión de los valores de una celda (que pueden venir como número, fecha o
// texto según cómo exporte cada sistema) a los tipos de VentaNormalizada.
// Devuelven null si el valor no se puede interpretar.

// Texto de un valor primitivo; cualquier otra cosa (un objeto raro de la celda) es vacío.
function aTexto(valor: unknown): string {
  return typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean' ? String(valor) : '';
}

const FECHA_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/;
const FECHA_CHILE = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2}))?/;

// Fecha "de pared": 03-11-2026 14:30 se guarda como 2026-11-03T14:30:00Z, sin
// convertir zonas horarias, igual que exceljs entrega las celdas de fecha.
export function parsearFecha(valor: unknown): Date | null {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  const texto = aTexto(valor).trim();
  const iso = FECHA_ISO.exec(texto);
  const chile = FECHA_CHILE.exec(texto);
  const partes = iso
    ? { anio: iso[1], mes: iso[2], dia: iso[3], hora: iso[4], minuto: iso[5] }
    : chile
      ? { anio: chile[3], mes: chile[2], dia: chile[1], hora: chile[4], minuto: chile[5] }
      : null;
  if (!partes) return null;

  const [anio, mes, dia, hora, minuto] = [partes.anio, partes.mes, partes.dia, partes.hora ?? '0', partes.minuto ?? '0'].map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, hora, minuto));
  // Rechaza fechas imposibles como 31-02-2026 (Date las "corre" al mes siguiente).
  const valida = fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia && hora < 24 && minuto < 60;
  return valida ? fecha : null;
}

// La base guarda enteros de 32 bits: un valor mayor haría fallar el INSERT de todo el archivo.
// Se rechaza la fila con un tope razonable (100 millones de pesos por venta, 10.000 unidades).
export const MAX_MONTO = 100_000_000;
export const MAX_CANTIDAD = 10_000;

// Monto en pesos, entero. Acepta números y textos como "$4.500", "4.500,50" o "4500".
// En Chile el punto separa miles y la coma, decimales.
export function parsearMonto(valor: unknown): number | null {
  if (typeof valor === 'number') return dentroDelTope(valor);
  const texto = aTexto(valor).replace(/[$\s]/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(texto)) return null;
  return dentroDelTope(Number(texto.replace(/\./g, '').replace(',', '.')));
}

function dentroDelTope(monto: number): number | null {
  return Number.isFinite(monto) && monto >= 0 && Math.round(monto) <= MAX_MONTO ? Math.round(monto) : null;
}

// Cantidad entera positiva. Si la columna no se mapeó o viene vacía, vale 1.
export function parsearCantidad(valor: unknown): number | null {
  if (valor === null || valor === undefined || aTexto(valor).trim() === '') return 1;
  const numero = Number(aTexto(valor).trim().replace(',', '.'));
  return Number.isInteger(numero) && numero > 0 && numero <= MAX_CANTIDAD ? numero : null;
}

export function parsearTexto(valor: unknown): string | null {
  const texto = aTexto(valor).trim();
  return texto === '' ? null : texto;
}
