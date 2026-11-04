import { parsearCantidad, parsearFecha, parsearMonto, parsearTexto } from './valores.js';

describe('parsearFecha', () => {
  it.each([
    ['2026-11-03', '2026-11-03T00:00:00.000Z'],
    ['2026-11-03 14:30', '2026-11-03T14:30:00.000Z'],
    ['03-11-2026', '2026-11-03T00:00:00.000Z'],
    ['3/11/2026 9:05', '2026-11-03T09:05:00.000Z'],
  ])('interpreta %s', (texto, esperado) => {
    expect(parsearFecha(texto)?.toISOString()).toBe(esperado);
  });

  it('acepta una celda de fecha de Excel tal cual', () => {
    const fecha = new Date('2026-11-03T14:30:00Z');

    expect(parsearFecha(fecha)).toBe(fecha);
  });

  it.each(['', 'ayer', '31-02-2026', '2026-13-01', '03-11-26', null])('rechaza %s', (valor) => {
    expect(parsearFecha(valor)).toBeNull();
  });
});

describe('parsearMonto', () => {
  it.each([
    [4500, 4500],
    [4500.6, 4501],
    ['4500', 4500],
    ['$4.500', 4500],
    ['$ 12.345.678', 12345678],
    ['4.500,50', 4501],
  ])('interpreta %s', (valor, esperado) => {
    expect(parsearMonto(valor)).toBe(esperado);
  });

  it.each(['', 'gratis', '4,500.50', '-100', -100, null])('rechaza %s', (valor) => {
    expect(parsearMonto(valor)).toBeNull();
  });

  it('rechaza montos absurdos (la base guarda enteros de 32 bits) pero acepta el máximo', () => {
    expect(parsearMonto(100_000_000)).toBe(100_000_000);
    expect(parsearMonto(100_000_001)).toBeNull();
    expect(parsearMonto('$3.000.000.000')).toBeNull();
  });
});

describe('parsearCantidad', () => {
  it('vale 1 si viene vacía', () => {
    expect(parsearCantidad(undefined)).toBe(1);
    expect(parsearCantidad('')).toBe(1);
  });

  it('acepta enteros positivos', () => {
    expect(parsearCantidad(3)).toBe(3);
    expect(parsearCantidad('2')).toBe(2);
  });

  it.each([0, -1, 1.5, 'dos'])('rechaza %s', (valor) => {
    expect(parsearCantidad(valor)).toBeNull();
  });

  it('rechaza cantidades absurdas pero acepta el máximo', () => {
    expect(parsearCantidad(10_000)).toBe(10_000);
    expect(parsearCantidad(10_001)).toBeNull();
  });
});

describe('parsearTexto', () => {
  it('recorta y devuelve null si queda vacío', () => {
    expect(parsearTexto('  Latte ')).toBe('Latte');
    expect(parsearTexto('   ')).toBeNull();
  });
});
