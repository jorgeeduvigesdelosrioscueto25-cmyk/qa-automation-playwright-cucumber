import fs from 'node:fs';
import { cargarConfiguracion, type Flag } from '../config/config_environment';
import { nombreReporte } from '../config/config_reportes';

export function prepararPipeline(entorno: NodeJS.ProcessEnv = process.env) {
  const efectivo = { ...entorno };
  const entradas: Record<string, Flag> = {
    INPUT_BROWSER: 'BROWSER',
    INPUT_MODE: 'EXECUTION_MODE',
    INPUT_HEADLESS: 'HEADLESS',
    INPUT_LOGS: 'EXECUTION_LOGS',
    INPUT_SCREENSHOTS: 'SCREENSHOT_EACH_STEP',
    INPUT_TRACE: 'TRACE_ON_FAILURE',
    INPUT_WORKERS: 'CUCUMBER_PARALLEL',
    INPUT_TAGS: 'TAGS',
    INPUT_TAP: 'TAP',
    INPUT_DRY_RUN: 'DRY_RUN',
  };
  for (const [entrada, flag] of Object.entries(entradas)) {
    const valor = entorno[entrada]?.trim();
    if (valor && valor !== 'properties')
      efectivo[flag] = valor === 'none' && (flag === 'TAGS' || flag === 'TAP') ? '' : valor;
  }
  const config = cargarConfiguracion(efectivo);
  const ahora = new Date();
  const report = nombreReporte(ahora, config.zona);
  // No transportar rutas absolutas del runner de preparacion a otros jobs.
  const flags = { ...config.entornoEjecucion, QA_CONFIG_FILE: 'config/automation.properties' };
  return {
    browser: config.browser,
    mode: config.modo,
    matrix: JSON.stringify(config.navegadores),
    report,
    environment: JSON.stringify({
      ...flags,
      QA_REPORT_NAME: report,
      QA_RUN_STARTED: ahora.toISOString(),
    }),
  };
}

if (require.main === module) {
  try {
    const salidas = prepararPipeline();
    if (process.env.GITHUB_OUTPUT)
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        Object.entries(salidas)
          .map(([clave, valor]) => `${clave}=${valor}\n`)
          .join(''),
      );
    else console.log(JSON.stringify(salidas, null, 2));
  } catch (error) {
    console.error(`CONFIGURACION PIPELINE: ${String(error)}`);
    process.exitCode = 1;
  }
}
