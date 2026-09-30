import path from 'node:path';
import fs from 'node:fs/promises';
export function nombreReporte(fecha: Date, zona: string): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const p = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `REPORT_${p.year}-${p.month}-${p.day}_${p.hour}-${p.minute}-${p.second}`;
}
export async function crearCarpetaReporte(zona: string): Promise<string> {
  const raiz = path.resolve('reports');
  await fs.mkdir(raiz, { recursive: true });
  for (let desplazamiento = 0; desplazamiento < 86400; desplazamiento++) {
    const carpeta = path.join(
      raiz,
      nombreReporte(new Date(Date.now() + desplazamiento * 1000), zona),
    );
    try {
      await fs.mkdir(carpeta);
      return carpeta;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  throw new Error('No fue posible reservar una carpeta de reporte unica');
}
