import fs from 'node:fs/promises';
import path from 'node:path';
import type { Page } from 'playwright';
export async function guardarCaptura(
  page: Page,
  carpetaCaso: string,
  nombre: string,
): Promise<string> {
  const carpeta = path.join(carpetaCaso, 'evidencias');
  await fs.mkdir(carpeta, { recursive: true });
  const archivo = path.join(carpeta, `${nombre}.png`);
  await page.screenshot({ path: archivo, fullPage: false });
  return path.relative(process.env.QA_RUN_DIR!, archivo).split(path.sep).join('/');
}
export async function escribirJsonAtomico(archivo: string, datos: unknown) {
  await fs.mkdir(path.dirname(archivo), { recursive: true });
  const temporal = `${archivo}.${process.pid}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(datos, null, 2));
  await fs.rename(temporal, archivo);
}
