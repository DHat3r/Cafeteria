import { BadRequestException } from '@nestjs/common';
import type { MapeoColumnas } from '@cafeteria/shared';

const OBLIGATORIOS = ['fecha', 'producto', 'monto'] as const;
const OPCIONALES = ['cantidad', 'correo', 'telefono', 'idExterno'] as const;

// Valida el mapeo que eligió el admin contra los encabezados reales del archivo.
export function validarMapeo(crudo: unknown, encabezados: string[]): MapeoColumnas {
  let mapeo: unknown = crudo;
  if (typeof crudo === 'string') {
    try {
      mapeo = JSON.parse(crudo);
    } catch {
      throw new BadRequestException('El mapeo debe ser JSON');
    }
  }
  if (!mapeo || typeof mapeo !== 'object') throw new BadRequestException('Falta el mapeo de columnas');

  const valores = mapeo as Record<string, unknown>;
  const resultado: Record<string, string> = {};
  for (const campo of [...OBLIGATORIOS, ...OPCIONALES]) {
    const columna = valores[campo];
    if (columna === undefined || columna === null || columna === '') {
      if ((OBLIGATORIOS as readonly string[]).includes(campo)) {
        throw new BadRequestException(`Elige la columna de "${campo}"`);
      }
      continue;
    }
    if (typeof columna !== 'string' || !encabezados.includes(columna)) {
      throw new BadRequestException(`La columna ${JSON.stringify(columna)} no existe en el archivo`);
    }
    resultado[campo] = columna;
  }
  return resultado as MapeoColumnas;
}
