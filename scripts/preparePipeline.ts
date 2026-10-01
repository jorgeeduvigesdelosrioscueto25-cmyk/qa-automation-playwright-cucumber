import fs from 'node:fs';
import { cargarConfiguracion } from '../config/config_environment';
import { nombreReporte } from '../config/config_reportes';

export function prepararPipeline(entorno: NodeJS.ProcessEnv = process.env) {
  const efectivo = { ...entorno };
  const navegador = entorno.INPUT_BROWSER?.trim();
  if (navegador) efectivo.BROWSER = navegador;
  const logs = entorno.INPUT_LOGS?.trim();
  if (logs) efectivo.EXECUTION_LOGS = logs;
  const modo = entorno.INPUT_MODE?.trim();
  if (modo) efectivo.EXECUTION_MODE = modo;
  const config = cargarConfiguracion(efectivo);
  // En la corrida manual el modo controla los escenarios del motor elegido.
  const workers = modo
    ? config.modo === 'parallel'
      ? Math.max(2, config.parallel)
      : 0
    : config.parallel;
  const ahora = new Date();
  const report = nombreReporte(ahora, config.zona);
  // No transportar rutas absolutas del runner de preparacion a otros jobs.
  const flags = {
    ...config.entornoEjecucion,
    CUCUMBER_PARALLEL: String(workers),
    QA_CONFIG_FILE: 'config/automation.properties',
  };
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
