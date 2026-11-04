import { BadRequestException, Injectable } from '@nestjs/common';
import type { Dashboard } from '@cafeteria/shared';
import { horaDePared } from '../comun/hora.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { calcularDashboard } from './calcular-dashboard.js';

const DIA_MS = 86_400_000;
const DIAS_POR_DEFECTO = 30;
const MAX_DIAS = 366;
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function aFechaUtc(texto: string): Date {
  const fecha = new Date(`${texto}T00:00:00Z`);
  // Rechaza fechas imposibles como 2026-02-31 (Date las "corre" al mes siguiente).
  if (!FORMATO_FECHA.test(texto) || Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto) {
    throw new BadRequestException(`Fecha inválida: ${texto}. Usa el formato YYYY-MM-DD`);
  }
  return fecha;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Sin parámetros, muestra los últimos 30 días contando hoy. "ahora" es la hora de pared del local
  // (las ventas se guardan así), no el instante UTC: de noche en Chile el día UTC ya es el siguiente.
  async obtener(desde?: string, hasta?: string, ahora = horaDePared(new Date())): Promise<Dashboard> {
    const finTexto = hasta ?? ahora.toISOString().slice(0, 10);
    const fin = aFechaUtc(finTexto);
    const inicioTexto = desde ?? new Date(fin.getTime() - (DIAS_POR_DEFECTO - 1) * DIA_MS).toISOString().slice(0, 10);
    const inicio = aFechaUtc(inicioTexto);

    if (inicio > fin) throw new BadRequestException('"desde" no puede ser posterior a "hasta"');
    if ((fin.getTime() - inicio.getTime()) / DIA_MS >= MAX_DIAS) {
      throw new BadRequestException(`El rango no puede superar ${MAX_DIAS} días`);
    }

    const ventas = await this.prisma.venta.findMany({
      // "hasta" es inclusivo: se consulta hasta el inicio del día siguiente.
      where: { fecha: { gte: inicio, lt: new Date(fin.getTime() + DIA_MS) } },
      select: { fecha: true, producto: true, cantidad: true, monto: true, clienteId: true },
    });

    const ids = [...new Set(ventas.map((v) => v.clienteId).filter((id): id is number => id !== null))];
    const clientes = await this.prisma.cliente.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } });

    return calcularDashboard(ventas, new Map(clientes.map((c) => [c.id, c.nombre])), inicioTexto, finTexto);
  }
}
