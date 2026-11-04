import { calcularDashboard } from './calcular-dashboard.js';
import type { VentaParaDashboard } from './calcular-dashboard.js';

// Venta de prueba con valores por defecto; cada test cambia solo lo que le importa.
function crearVenta(datos: Partial<VentaParaDashboard>): VentaParaDashboard {
  return {
    fecha: new Date('2026-11-03T10:00:00Z'),
    producto: 'Latte',
    cantidad: 1,
    monto: 0,
    clienteId: null,
    ...datos,
  };
}

describe('calcularDashboard', () => {
  it('sin ventas: totales en cero y un día en cero por cada día del rango', () => {
    const resultado = calcularDashboard([], new Map(), '2026-11-01', '2026-11-03');

    expect(resultado).toEqual({
      desde: '2026-11-01',
      hasta: '2026-11-03',
      totalVentas: 0,
      cantidadVentas: 0,
      ticketPromedio: 0,
      porcentajeAsociado: 0,
      ventasPorDia: [
        { fecha: '2026-11-01', monto: 0, cantidad: 0 },
        { fecha: '2026-11-02', monto: 0, cantidad: 0 },
        { fecha: '2026-11-03', monto: 0, cantidad: 0 },
      ],
      topProductos: [],
      topClientes: [],
    });
  });

  it('calcula total, cantidad y ticket promedio', () => {
    const ventas = [
      crearVenta({ monto: 3500 }),
      crearVenta({ monto: 2200 }),
      crearVenta({ monto: 2400 }),
    ];

    const resultado = calcularDashboard(ventas, new Map(), '2026-11-03', '2026-11-03');

    expect(resultado.totalVentas).toBe(8100);
    expect(resultado.cantidadVentas).toBe(3);
    expect(resultado.ticketPromedio).toBe(2700);
  });

  it('calcula el porcentaje de ventas asociadas a un cliente, con redondeo', () => {
    const tresDeCuatro = [
      crearVenta({ clienteId: 1 }),
      crearVenta({ clienteId: 2 }),
      crearVenta({ clienteId: 3 }),
      crearVenta({ clienteId: null }),
    ];
    const unoDeTres = [
      crearVenta({ clienteId: 1 }),
      crearVenta({ clienteId: null }),
      crearVenta({ clienteId: null }),
    ];

    expect(calcularDashboard(tresDeCuatro, new Map(), '2026-11-03', '2026-11-03').porcentajeAsociado).toBe(75);
    expect(calcularDashboard(unoDeTres, new Map(), '2026-11-03', '2026-11-03').porcentajeAsociado).toBe(33);
  });

  it('agrupa ventas por día en orden ascendente e incluye el día sin ventas', () => {
    const ventas = [
      crearVenta({ fecha: new Date('2026-11-03T16:00:00Z'), monto: 2000 }),
      crearVenta({ fecha: new Date('2026-11-01T09:00:00Z'), monto: 1000 }),
      crearVenta({ fecha: new Date('2026-11-01T18:30:00Z'), monto: 500 }),
    ];

    const resultado = calcularDashboard(ventas, new Map(), '2026-11-01', '2026-11-03');

    expect(resultado.ventasPorDia).toEqual([
      { fecha: '2026-11-01', monto: 1500, cantidad: 2 },
      { fecha: '2026-11-02', monto: 0, cantidad: 0 },
      { fecha: '2026-11-03', monto: 2000, cantidad: 1 },
    ]);
  });

  it('una venta fuera del rango no aparece en ventasPorDia pero sí en los totales', () => {
    const ventas = [
      crearVenta({ fecha: new Date('2026-11-01T10:00:00Z'), monto: 1000 }),
      crearVenta({ fecha: new Date('2026-11-05T10:00:00Z'), monto: 900 }),
    ];

    const resultado = calcularDashboard(ventas, new Map(), '2026-11-01', '2026-11-02');

    expect(resultado.ventasPorDia).toEqual([
      { fecha: '2026-11-01', monto: 1000, cantidad: 1 },
      { fecha: '2026-11-02', monto: 0, cantidad: 0 },
    ]);
    expect(resultado.totalVentas).toBe(1900);
    expect(resultado.cantidadVentas).toBe(2);
  });

  it('agrupa productos ignorando mayúsculas y espacios, ordena por monto y limita a 5', () => {
    const ventas = [
      crearVenta({ producto: ' Latte ', cantidad: 2, monto: 3000 }),
      crearVenta({ producto: 'Té', cantidad: 3, monto: 2500 }),
      crearVenta({ producto: 'Capuchino', cantidad: 1, monto: 2500 }),
      crearVenta({ producto: 'latte', cantidad: 1, monto: 1500 }),
      crearVenta({ producto: 'LATTE', cantidad: 1, monto: 1500 }),
      crearVenta({ producto: 'Muffin', cantidad: 1, monto: 1000 }),
      crearVenta({ producto: 'Jugo', cantidad: 1, monto: 800 }),
      crearVenta({ producto: 'Brownie', cantidad: 1, monto: 500 }),
      crearVenta({ producto: 'Galleta', cantidad: 1, monto: 300 }),
    ];

    const resultado = calcularDashboard(ventas, new Map(), '2026-11-03', '2026-11-03');

    expect(resultado.topProductos).toEqual([
      { producto: 'Latte', unidades: 4, monto: 6000 },
      { producto: 'Capuchino', unidades: 1, monto: 2500 },
      { producto: 'Té', unidades: 3, monto: 2500 },
      { producto: 'Muffin', unidades: 1, monto: 1000 },
      { producto: 'Jugo', unidades: 1, monto: 800 },
    ]);
  });

  it('topClientes ignora ventas sin cliente, usa nombres y ordena con desempates', () => {
    const nombres = new Map<number, string>([
      [2, 'Elena'],
      [3, 'Carla'],
      [4, 'Diego'],
      [6, 'Felipe'],
      [7, 'Bruno'],
    ]);
    const ventas = [
      crearVenta({ clienteId: 7, monto: 3000 }),
      crearVenta({ clienteId: 3, monto: 1500 }),
      crearVenta({ clienteId: 3, monto: 1500 }),
      crearVenta({ clienteId: 9, monto: 3000 }),
      crearVenta({ clienteId: 2, monto: 200 }),
      crearVenta({ clienteId: 4, monto: 100 }),
      crearVenta({ clienteId: 6, monto: 50 }),
      crearVenta({ clienteId: null, monto: 9999 }),
    ];

    const resultado = calcularDashboard(ventas, nombres, '2026-11-03', '2026-11-03');

    expect(resultado.topClientes).toEqual([
      { clienteId: 3, nombre: 'Carla', compras: 2, monto: 3000 },
      { clienteId: 7, nombre: 'Bruno', compras: 1, monto: 3000 },
      { clienteId: 9, nombre: 'Cliente', compras: 1, monto: 3000 },
      { clienteId: 2, nombre: 'Elena', compras: 1, monto: 200 },
      { clienteId: 4, nombre: 'Diego', compras: 1, monto: 100 },
    ]);
  });

  it('con hasta anterior a desde, ventasPorDia queda vacío', () => {
    const ventas = [crearVenta({ monto: 1000 })];

    const resultado = calcularDashboard(ventas, new Map(), '2026-11-05', '2026-11-03');

    expect(resultado.ventasPorDia).toEqual([]);
    expect(resultado.totalVentas).toBe(1000);
  });
});
