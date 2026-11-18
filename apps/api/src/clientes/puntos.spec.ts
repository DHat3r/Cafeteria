import { calcularPuntos } from '@cafeteria/shared';

describe('calcularPuntos', () => {
  it('no da puntos por montos menores a $1.000', () => {
    expect(calcularPuntos(0)).toBe(0);
    expect(calcularPuntos(999)).toBe(0);
  });

  it('da 1 punto por cada $1.000 completos', () => {
    expect(calcularPuntos(1000)).toBe(1);
    expect(calcularPuntos(2599)).toBe(2);
    expect(calcularPuntos(10000)).toBe(10);
  });
});
