import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';
import { cargarConfiguracion } from '../config/config_environment';
import { crearCarpetaReporte } from '../config/config_reportes';
import { DataTestManager } from '../config/config_dataTestManager';
import { seleccionarCasos } from './selectCases';
import {
  consolidar,
  generarDashboard,
  generarReportesFinales,
} from '../src/utilities/util_reportes';
import { mostrarResumen } from '../src/utilities/util_consola';
import { escribirJsonAtomico } from '../src/utilities/util_evidencias';
import { textoExacto } from '../src/utilities/util_texto';
import type { Manifiesto, Navegador } from '../src/types/type_ejecucion';
async function ejecutar() {
  const { values } = parseArgs({
    options: {
      browser: { type: 'string' },
      mode: { type: 'string' },
      tags: { type: 'string', multiple: true },
      tap: { type: 'string' },
      headed: { type: 'boolean' },
      headless: { type: 'string' },
      logs: { type: 'string' },
      screenshots: { type: 'string' },
      trace: { type: 'string' },
      config: { type: 'string' },
      'dry-run': { type: 'boolean' },
      'scenario-parallel': { type: 'string' },
    },
  });
  if (values.config) process.env.QA_CONFIG_FILE = values.config;
  if (values.browser) process.env.BROWSER = values.browser;
  if (values.mode) process.env.EXECUTION_MODE = values.mode;
  if (values.headed) process.env.HEADLESS = 'false';
  if (values.headed && values.headless !== undefined)
    throw new Error('Use --headed o --headless, sin combinarlos');
  if (values.headless !== undefined) process.env.HEADLESS = values.headless;
  if (values.logs !== undefined) process.env.EXECUTION_LOGS = values.logs;
  if (values.screenshots !== undefined) process.env.SCREENSHOT_EACH_STEP = values.screenshots;
  if (values.trace !== undefined) process.env.TRACE_ON_FAILURE = values.trace;
  if (values.tags !== undefined)
    process.env.TAGS = values.tags
      .filter(Boolean)
      .map((tag) => `(${tag})`)
      .join(' and ');
  if (values.tap !== undefined) process.env.TAP = values.tap;
  if (values['dry-run']) process.env.DRY_RUN = 'true';
  if (values['scenario-parallel']) process.env.CUCUMBER_PARALLEL = values['scenario-parallel'];
  const config = cargarConfiguracion();
  let carpeta: string;
  if (process.env.QA_REPORT_NAME) {
    if (!/^REPORT_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/.test(process.env.QA_REPORT_NAME))
      throw new Error('QA_REPORT_NAME no valido');
    carpeta = path.resolve('reports', process.env.QA_REPORT_NAME);
    await fs.mkdir(path.dirname(carpeta), { recursive: true });
    await fs.mkdir(carpeta); // Nunca sobrescribir una corrida.
  } else carpeta = await crearCarpetaReporte(config.zona);
  const inicio = process.env.QA_RUN_STARTED || new Date().toISOString();
  if (!Number.isFinite(new Date(inicio).getTime())) throw new Error('QA_RUN_STARTED no valido');
  const manifiesto: Manifiesto = {
    inicio,
    reporte: path.basename(carpeta),
    navegadores: config.navegadores,
    modo: config.modo,
    baseUrl: config.baseUrl,
    casos: [],
    dryRun: config.dryRun,
  };
  const errores: string[] = [];
  try {
    const gestor = new DataTestManager(path.resolve(config.dataFile));
    await gestor.inicializar();
    manifiesto.casos = await seleccionarCasos(gestor, config.tags, config.taps);
  } catch (error) {
    errores.push(`CONFIGURACION/DATOS: ${String(error)}`);
    await generarReportesFinales(carpeta, await consolidar(carpeta, manifiesto, true, errores));
    console.error(errores[0]);
    console.log(`Dashboard: ${path.join(carpeta, 'resumen/dashboard.html')}`);
    process.exitCode = 1;
    return;
  }
  await escribirJsonAtomico(path.join(carpeta, 'json', 'seleccion.json'), manifiesto);
  for (const navegador of config.navegadores) {
    await fs.mkdir(path.join(carpeta, 'navegadores', navegador, 'json'), { recursive: true });
    await escribirJsonAtomico(path.join(carpeta, 'json', `seleccion-${navegador}.json`), {
      ...manifiesto,
      navegadores: [navegador],
    });
  }
  console.log(
    `QA AUTOMATION · Sauce Demo\nReporte: ${carpeta}\nNavegadores: ${config.navegadores.join(', ')} · Modo: ${config.modo} · Cucumber workers: ${config.parallel}`,
  );
  mostrarResumen(await consolidar(carpeta, manifiesto));
  await generarDashboard(carpeta, await consolidar(carpeta, manifiesto));
  const patrones = manifiesto.casos.map((caso) => textoExacto(caso.nombreGherkin).source).join('|');
  const correr = (navegador: Navegador) =>
    new Promise<number>((resolver) => {
      const argumentos = [
        path.resolve(path.dirname(require.resolve('@cucumber/cucumber')), '../bin/cucumber.js'),
        '--name',
        patrones,
      ];
      if (manifiesto.dryRun) argumentos.push('--dry-run');
      const proceso = spawn(process.execPath, argumentos, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ...config.entornoEjecucion,
          QA_RUN_DIR: carpeta,
          QA_BROWSER: navegador,
          CUCUMBER_PARALLEL: String(config.parallel),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
      const log = path.join(carpeta, 'navegadores', navegador, 'json', 'cucumber.log');
      let cola = Promise.resolve();
      const registrar = (dato: Buffer) => {
        cola = cola.then(() => fs.appendFile(log, dato));
        if (config.logs) process.stdout.write(`[${navegador}] ${dato.toString()}`);
      };
      proceso.stdout.on('data', registrar);
      proceso.stderr.on('data', registrar);
      let terminado = false;
      const terminar = async (codigo: number, error?: Error) => {
        if (terminado) return;
        terminado = true;
        try {
          await cola;
        } catch (fallo) {
          errores.push(`Log ${navegador}: ${String(fallo)}`);
        }
        if (error) errores.push(`${navegador}: ${error.message}`);
        if (codigo !== 0)
          errores.push(
            `${navegador}: Cucumber finalizo con codigo ${codigo}. Consulte navegadores/${navegador}/json/cucumber.log`,
          );
        console.log(
          `[${navegador}] ${manifiesto.dryRun ? 'Validacion Gherkin' : 'Ejecucion'} finalizada, codigo ${codigo}`,
        );
        resolver(codigo);
      };
      proceso.on('error', (error) => void terminar(1, error));
      proceso.on('close', (codigo) => void terminar(codigo ?? 1));
    });
  let actualizando = false;
  let ultimoConteo = '';
  const temporizador = setInterval(() => {
    if (actualizando || manifiesto.dryRun) return;
    actualizando = true;
    void consolidar(carpeta, manifiesto)
      .then(async (resumen) => {
        const conteo = JSON.stringify(resumen.metricas);
        if (conteo !== ultimoConteo) {
          ultimoConteo = conteo;
          mostrarResumen(resumen);
          await generarDashboard(carpeta, resumen);
        }
      })
      .catch((error) => {
        errores.push(`Actualizacion de reportes: ${String(error)}`);
      })
      .finally(() => {
        actualizando = false;
      });
  }, 1500);
  const codigos: number[] = [];
  try {
    if (config.modo === 'parallel')
      codigos.push(...(await Promise.all(config.navegadores.map(correr))));
    else for (const navegador of config.navegadores) codigos.push(await correr(navegador));
  } finally {
    clearInterval(temporizador);
  }
  // Esperar una escritura de dashboard que ya hubiera comenzado antes de consolidar.
  while (actualizando) await new Promise((resolver) => setImmediate(resolver));
  const resumen = await consolidar(carpeta, manifiesto, !manifiesto.dryRun, errores);
  if (manifiesto.dryRun) {
    await generarDashboard(carpeta, resumen);
    console.log(
      'DRY RUN: valida definiciones Gherkin sin ejecutar navegadores. No representa pruebas PASSED.',
    );
  } else {
    await generarReportesFinales(carpeta, resumen);
    mostrarResumen(resumen);
  }
  console.log(`Dashboard: ${path.join(carpeta, 'resumen/dashboard.html')}`);
  process.exitCode =
    codigos.some((codigo) => codigo !== 0) ||
    resumen.metricas.failed ||
    resumen.erroresTecnicos.length
      ? 1
      : 0;
}
ejecutar().catch((error) => {
  console.error(`ERROR TECNICO: ${String(error)}`);
  process.exitCode = 1;
});
