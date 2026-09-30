import { expect as asercion } from '@playwright/test';
import { cargarConfiguracion } from '../../config/config_environment';
// Solo aserciones: Cucumber es el unico ejecutor de escenarios.
export const expect = asercion.configure({ timeout: cargarConfiguracion().assertionTimeout });
export function importe(texto: string): number {
  const coincidencia = texto.match(/\$([\d]+(?:\.\d{2})?)/);
  if (!coincidencia) throw new Error(`Importe no valido: ${texto}`);
  return Number(coincidencia[1]);
}
export { textoExacto } from './util_texto';
