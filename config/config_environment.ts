import fs from 'node:fs';
import path from 'node:path';
import { NAVEGADORES, type Navegador } from '../src/types/type_ejecucion';
export const FLAGS_PREDETERMINADOS = {
  BASE_URL: 'https://www.saucedemo.com/',
  BROWSER: 'all',
  EXECUTION_MODE: 'parallel',
  HEADLESS: 'true',
  CUCUMBER_PARALLEL: '0',
  ACTION_TIMEOUT: '15000',
  ASSERTION_TIMEOUT: '10000',
  SCENARIO_TIMEOUT: '120000',
  EXECUTION_LOGS: 'false',
  SCREENSHOT_EACH_STEP: 'true',
  TRACE_ON_FAILURE: 'true',
  REPORT_TIMEZONE: 'America/Lima',
  DATA_FILE: 'resources/data/xc-DataTest.xlsx',
  TAGS: '',
  TAP: '',
  DRY_RUN: 'false',
};
export type Flag = keyof typeof FLAGS_PREDETERMINADOS;
export function leerProperties(archivo: string): Partial<Record<Flag, string>> {
  const valores: Partial<Record<Flag, string>> = {};
  const lineas = fs
    .readFileSync(archivo, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/);
  for (const [indice, original] of lineas.entries()) {
    const linea = original.trim();
    if (!linea || linea.startsWith('#') || linea.startsWith('!')) continue;
    const separador = linea.indexOf('=');
    if (separador < 1) throw new Error(`Properties: use CLAVE=valor en linea ${indice + 1}`);
    const clave = linea.slice(0, separador).trim();
    if (!Object.hasOwn(FLAGS_PREDETERMINADOS, clave))
      throw new Error(`Properties: flag desconocido ${clave}`);
    if (Object.hasOwn(valores, clave)) throw new Error(`Properties: flag duplicado ${clave}`);
    valores[clave as Flag] = linea.slice(separador + 1).trim();
  }
  return valores;
}
export function cargarConfiguracion(
  entorno: NodeJS.ProcessEnv = process.env,
  archivo = path.resolve(entorno.QA_CONFIG_FILE || 'config/automation.properties'),
) {
  const properties = leerProperties(archivo);
  const valores = Object.fromEntries(
    (Object.keys(FLAGS_PREDETERMINADOS) as Flag[]).map((clave) => [
      clave,
      (entorno[clave] ?? properties[clave] ?? FLAGS_PREDETERMINADOS[clave]).trim(),
    ]),
  ) as Record<Flag, string>;
  // Cucumber 13 usa CUCUMBER_PARALLEL=true dentro de sus workers.
  if (entorno.CUCUMBER_WORKER_ID !== undefined && entorno.CUCUMBER_PARALLEL === 'true')
    valores.CUCUMBER_PARALLEL = entorno.CUCUMBER_TOTAL_WORKERS ?? '0';
  const booleano = (nombre: Flag): boolean => {
    valores[nombre] = valores[nombre].toLowerCase();
    if (!['true', 'false'].includes(valores[nombre]))
      throw new Error(`${nombre} debe ser true o false`);
    return valores[nombre] === 'true';
  };
  const entero = (nombre: Flag, minimo: number): number => {
    const valor = Number(valores[nombre]);
    if (!/^\d+$/.test(valores[nombre]) || !Number.isSafeInteger(valor) || valor < minimo)
      throw new Error(`${nombre} debe ser entero >= ${minimo}`);
    return valor;
  };
  const browser = valores.BROWSER.toLowerCase();
  const modo = valores.EXECUTION_MODE.toLowerCase();
  valores.BROWSER = browser;
  valores.EXECUTION_MODE = modo;
  if (![...NAVEGADORES, 'all'].includes(browser)) throw new Error(`BROWSER no valido: ${browser}`);
  if (!['parallel', 'sequential'].includes(modo))
    throw new Error(`EXECUTION_MODE no valido: ${modo}`);
  const baseUrl = valores.BASE_URL;
  if (!['http:', 'https:'].includes(new URL(baseUrl).protocol))
    throw new Error('BASE_URL debe usar HTTP(S)');
  const zona = valores.REPORT_TIMEZONE;
  new Intl.DateTimeFormat('en', { timeZone: zona }).format(new Date());
  if (!valores.DATA_FILE) throw new Error('DATA_FILE no puede estar vacio');
  const taps = valores.TAP ? valores.TAP.split(',').map((tap) => tap.trim()) : [];
  if (taps.some((tap) => !/^TAP-\d{3}$/.test(tap)) || new Set(taps).size !== taps.length)
    throw new Error('TAP debe usar TAP-001,TAP-007 sin duplicados');
  return {
    baseUrl,
    browser,
    modo,
    zona,
    navegadores: browser === 'all' ? [...NAVEGADORES] : [browser as Navegador],
    headless: booleano('HEADLESS'),
    parallel: entero('CUCUMBER_PARALLEL', 0),
    actionTimeout: entero('ACTION_TIMEOUT', 1),
    assertionTimeout: entero('ASSERTION_TIMEOUT', 1),
    scenarioTimeout: entero('SCENARIO_TIMEOUT', 1),
    logs: booleano('EXECUTION_LOGS'),
    capturas: booleano('SCREENSHOT_EACH_STEP'),
    trazas: booleano('TRACE_ON_FAILURE'),
    dryRun: booleano('DRY_RUN'),
    dataFile: valores.DATA_FILE,
    tags: valores.TAGS,
    taps,
    entornoEjecucion: { ...valores, QA_CONFIG_FILE: path.resolve(archivo) },
  };
}
