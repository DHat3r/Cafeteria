import { horaDePared } from './hora.js';

describe('horaDePared', () => {
  it('en verano de Chile (UTC-3) atrasa 3 horas y a las 23:30 sigue siendo el día anterior', () => {
    // 02:30 UTC del 4 de noviembre son las 23:30 del 3 de noviembre en Santiago.
    expect(horaDePared(new Date('2026-11-04T02:30:00Z')).toISOString()).toBe('2026-11-03T23:30:00.000Z');
  });

  it('en invierno de Chile (UTC-4) atrasa 4 horas', () => {
    expect(horaDePared(new Date('2026-07-01T12:00:00Z')).toISOString()).toBe('2026-07-01T08:00:00.000Z');
  });

  it('medianoche se expresa como 00:00 y no como 24:00', () => {
    // 03:00 UTC del 4 de noviembre son las 00:00 del 4 en Santiago (UTC-3).
    expect(horaDePared(new Date('2026-11-04T03:00:00Z')).toISOString()).toBe('2026-11-04T00:00:00.000Z');
  });

  it('con la zona UTC devuelve el mismo instante', () => {
    const instante = new Date('2026-11-04T02:30:00Z');

    expect(horaDePared(instante, 'UTC').toISOString()).toBe(instante.toISOString());
  });
});
