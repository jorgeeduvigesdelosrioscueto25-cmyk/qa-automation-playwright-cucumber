import { chromium, firefox, webkit, type Browser } from 'playwright';
import type { Navegador } from '../src/types/type_ejecucion';
export async function abrirNavegador(
  nombre: Navegador,
  headless: boolean,
  timeout: number,
): Promise<Browser> {
  return { chromium, firefox, webkit }[nombre].launch({ headless, timeout });
}
