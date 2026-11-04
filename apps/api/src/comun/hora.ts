// Las ventas se guardan como "hora de pared" del local, sin convertir zonas horarias: si el Excel
// dice 14:30, se guarda 14:30 UTC. Por eso, para compararlas con "ahora", también hay que
// expresar "ahora" como la hora que marca el reloj del local (y no como el instante UTC real:
// de noche en Chile el día UTC ya es el siguiente).
export const ZONA_HORARIA_LOCAL = 'America/Santiago';

export function horaDePared(instante: Date, zona: string = ZONA_HORARIA_LOCAL): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    // h23: la medianoche es 00, no 24.
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante);

  const valor = (tipo: Intl.DateTimeFormatPartTypes): number => Number(partes.find((p) => p.type === tipo)?.value);
  return new Date(
    Date.UTC(valor('year'), valor('month') - 1, valor('day'), valor('hour'), valor('minute'), valor('second')),
  );
}
