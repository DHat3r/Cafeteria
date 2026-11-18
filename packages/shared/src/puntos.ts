// 1 punto por cada $1.000 consumidos
export const PESOS_POR_PUNTO = 1000;

export function calcularPuntos(montoTotal: number): number {
  return Math.floor(montoTotal / PESOS_POR_PUNTO);
}
