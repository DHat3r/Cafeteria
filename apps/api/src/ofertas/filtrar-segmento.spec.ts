import type { Segmento } from '@cafeteria/shared';
import { filtrarSegmento } from './filtrar-segmento.js';
import type { ClienteSegmentable } from './filtrar-segmento.js';

const MILISEGUNDOS_POR_DIA = 86400000;
const ahora = new Date('2026-11-10T12:00:00Z');

// Fecha que cae la cantidad de días indicada antes de "ahora".
function haceDias(dias: number): Date {
  return new Date(ahora.getTime() - dias * MILISEGUNDOS_POR_DIA);
}

function cliente(bajaEn: Date | null, compras: { fecha: Date; producto: string }[]): ClienteSegmentable {
  return { bajaEn, compras };
}

describe('filtrarSegmento', () => {
  it('excluye a los dados de baja aunque cumplan el segmento', () => {
    const dadoDeBaja = cliente(haceDias(1), [{ fecha: haceDias(1), producto: 'Latte' }]);

    expect(filtrarSegmento([dadoDeBaja], { minCompras: 0, dias: 30 }, ahora)).toEqual([]);
    expect(filtrarSegmento([dadoDeBaja], { minCompras: 1, dias: 30 }, ahora)).toEqual([]);
  });

  it('con minCompras 0 devuelve todos los clientes sin baja, incluso sin compras', () => {
    const sinCompras = cliente(null, []);
    const conCompras = cliente(null, [{ fecha: haceDias(2), producto: 'Espresso' }]);
    const dadoDeBaja = cliente(haceDias(1), []);

    const resultado = filtrarSegmento([sinCompras, conCompras, dadoDeBaja], { minCompras: 0, dias: 7 }, ahora);

    expect(resultado).toEqual([sinCompras, conCompras]);
  });

  it('cuenta solo las compras dentro de los últimos días, con límite inclusivo', () => {
    const compraDeHace7Dias = cliente(null, [{ fecha: haceDias(7), producto: 'Latte' }]);

    expect(filtrarSegmento([compraDeHace7Dias], { minCompras: 1, dias: 7 }, ahora)).toEqual([compraDeHace7Dias]);
    expect(filtrarSegmento([compraDeHace7Dias], { minCompras: 1, dias: 6 }, ahora)).toEqual([]);
  });

  it('ignora compras con fecha posterior a ahora', () => {
    const compraFutura = cliente(null, [{ fecha: new Date(ahora.getTime() + 1000), producto: 'Latte' }]);

    expect(filtrarSegmento([compraFutura], { minCompras: 1, dias: 30 }, ahora)).toEqual([]);
  });

  it('con producto compara sin distinguir mayúsculas ni espacios', () => {
    const compras = [
      { fecha: haceDias(1), producto: 'Latte' },
      { fecha: haceDias(1), producto: ' LATTE ' },
      { fecha: haceDias(1), producto: 'latte' },
      { fecha: haceDias(1), producto: 'Espresso' },
    ];
    const clienteFiel = cliente(null, compras);
    const segmento = (minCompras: number): Segmento => ({ producto: 'latte', minCompras, dias: 30 });

    expect(filtrarSegmento([clienteFiel], segmento(3), ahora)).toEqual([clienteFiel]);
    expect(filtrarSegmento([clienteFiel], segmento(4), ahora)).toEqual([]);
  });

  it('con producto solo de espacios se comporta como si no hubiera producto', () => {
    const variado = cliente(null, [
      { fecha: haceDias(1), producto: 'Latte' },
      { fecha: haceDias(2), producto: 'Espresso' },
    ]);

    expect(filtrarSegmento([variado], { producto: '   ', minCompras: 2, dias: 30 }, ahora)).toEqual([variado]);
  });

  it('respeta minCompras: con 2 compras no entra y con 3 sí', () => {
    const dos = cliente(null, [
      { fecha: haceDias(1), producto: 'Latte' },
      { fecha: haceDias(2), producto: 'Latte' },
    ]);
    const tres = cliente(null, [
      { fecha: haceDias(1), producto: 'Latte' },
      { fecha: haceDias(2), producto: 'Latte' },
      { fecha: haceDias(3), producto: 'Latte' },
    ]);

    expect(filtrarSegmento([dos, tres], { minCompras: 3, dias: 30 }, ahora)).toEqual([tres]);
  });

  it('devuelve los mismos objetos y conserva el orden', () => {
    const primero = cliente(null, [{ fecha: haceDias(1), producto: 'Latte' }]);
    const segundo = cliente(null, []);
    const tercero = cliente(null, [{ fecha: haceDias(1), producto: 'Latte' }]);

    const resultado = filtrarSegmento([primero, segundo, tercero], { minCompras: 1, dias: 30 }, ahora);

    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toBe(primero);
    expect(resultado[1]).toBe(tercero);
  });
});
