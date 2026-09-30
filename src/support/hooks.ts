import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BeforeAll,
  Before,
  AfterStep,
  After,
  AfterAll,
  setDefaultTimeout,
  Status,
} from '@cucumber/cucumber';
import { selectors, type Browser } from 'playwright';
import { CustomWorld } from './customWorld';
import { cargarConfiguracion } from '../../config/config_environment';
import { abrirNavegador } from '../../config/config_navegador';
import type { Manifiesto, Navegador } from '../types/type_ejecucion';
import { guardarCaptura, escribirJsonAtomico } from '../utilities/util_evidencias';
const config = cargarConfiguracion();
setDefaultTimeout(config.scenarioTimeout);
let browser: Browser | undefined;
let manifiesto: Manifiesto;
const navegador = process.env.QA_BROWSER as Navegador;
BeforeAll(async function () {
  if (!process.env.QA_RUN_DIR || !navegador) throw new Error('Use el orquestador npm test');
  manifiesto = JSON.parse(
    await fs.readFile(path.join(process.env.QA_RUN_DIR, 'json', 'seleccion.json'), 'utf8'),
  ) as Manifiesto;
  selectors.setTestIdAttribute('data-test');
});
Before(async function (this: CustomWorld, { pickle }) {
  const caso = manifiesto.casos.find(
    (seleccionado) =>
      seleccionado.nombreGherkin === pickle.name &&
      seleccionado.uri.replaceAll('\\', '/') === pickle.uri.replaceAll('\\', '/'),
  );
  if (!caso) throw new Error(`Caso fuera del manifiesto de seleccion: ${pickle.name}`);
  this.caso = caso;
  this.datosPrueba = caso.datos;
  this.inicioMs = Date.now();
  this.carpetaCaso = path.join(
    process.env.QA_RUN_DIR!,
    'navegadores',
    navegador,
    'escenarios',
    caso.datos.tap,
  );
  this.resultado = {
    tap: caso.datos.tap,
    id: caso.id,
    escenario: caso.datos.escenario,
    nombreGherkin: caso.nombreGherkin,
    modulo: caso.datos.hoja,
    navegador,
    estado: 'PENDING',
    inicio: new Date().toISOString(),
    duracionMs: 0,
    url: manifiesto.baseUrl,
    pasos: [],
  };
  await fs.mkdir(this.carpetaCaso, { recursive: true });
  this.attach(
    JSON.stringify({
      TAP: caso.datos.tap,
      ID: caso.id,
      hoja: caso.datos.hoja,
      resultadoEsperado: caso.datos.resultadoEsperado,
    }),
    'application/json',
  );
  if (!caso.datos.ejecutar) {
    this.resultado.estado = 'SKIPPED';
    this.resultado.motivo = 'EJECUTAR=NO en Excel';
    return 'skipped';
  }
  try {
    browser ??= await abrirNavegador(navegador, config.headless, config.actionTimeout);
    this.contexto = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    this.contexto.setDefaultTimeout(config.actionTimeout);
    this.contexto.setDefaultNavigationTimeout(config.actionTimeout);
    if (config.trazas)
      await this.contexto.tracing.start({ screenshots: true, snapshots: true, sources: true });
    this.prepararPages(await this.contexto.newPage());
  } catch (error) {
    this.resultado.tipoError = 'INFRAESTRUCTURA';
    this.resultado.error = String(error);
    throw error;
  }
});
AfterStep(async function (this: CustomWorld, { pickleStep, result }) {
  const indice = this.resultado.pasos.length + 1;
  const paso = {
    nombre: pickleStep.text,
    estado: result.status,
    duracionMs: Number(result.duration.seconds) * 1000 + result.duration.nanos / 1e6,
    error: result.message,
    captura: undefined as string | undefined,
  };
  this.resultado.pasos.push(paso);
  if (this.page && config.capturas) {
    paso.captura = await guardarCaptura(
      this.page,
      this.carpetaCaso,
      `paso-${String(indice).padStart(2, '0')}`,
    );
    await this.attach(
      await fs.readFile(path.join(process.env.QA_RUN_DIR!, paso.captura)),
      'image/png',
    );
  }
});
After(async function (this: CustomWorld, { result }) {
  if (!this.resultado) return;
  if (this.resultado.estado !== 'SKIPPED') {
    this.resultado.estado = result?.status === Status.PASSED ? 'PASSED' : 'FAILED';
    if (this.resultado.estado === 'FAILED') {
      this.resultado.error ||= result?.message || 'Escenario no finalizado correctamente';
      this.resultado.tipoError ||= this.resultado.pasos.some((paso) => paso.estado === 'FAILED')
        ? 'FUNCIONAL'
        : 'INFRAESTRUCTURA';
    }
  }
  for (let indice = this.resultado.pasos.length; indice < this.caso.pasos.length; indice++)
    this.resultado.pasos.push({
      nombre: this.caso.pasos[indice],
      estado: 'SKIPPED',
      duracionMs: 0,
    });
  try {
    if (this.resultado.estado === 'FAILED' && this.page && !this.page.isClosed()) {
      const captura = await guardarCaptura(this.page, this.carpetaCaso, 'error');
      const fallido = this.resultado.pasos.find((paso) => paso.estado === 'FAILED');
      if (fallido) fallido.captura ||= captura;
    }
    if (this.contexto && config.trazas) {
      const trace = path.join(this.carpetaCaso, 'evidencias', 'trace.zip');
      if (this.resultado.estado === 'FAILED')
        await fs.mkdir(path.dirname(trace), { recursive: true });
      await this.contexto.tracing.stop(
        this.resultado.estado === 'FAILED' ? { path: trace } : undefined,
      );
      if (this.resultado.estado === 'FAILED')
        this.resultado.trace = path
          .relative(process.env.QA_RUN_DIR!, trace)
          .split(path.sep)
          .join('/');
    }
  } catch (error) {
    this.resultado.estado = 'FAILED';
    this.resultado.tipoError ||= 'INFRAESTRUCTURA';
    this.resultado.error =
      `${this.resultado.error || ''}\nError al guardar evidencias: ${String(error)}`.trim();
  } finally {
    try {
      await this.contexto?.close();
    } catch (error) {
      this.resultado.estado = 'FAILED';
      this.resultado.tipoError ||= 'INFRAESTRUCTURA';
      this.resultado.error =
        `${this.resultado.error || ''}\nError al cerrar contexto: ${String(error)}`.trim();
    }
    this.resultado.duracionMs = Date.now() - this.inicioMs;
    await escribirJsonAtomico(path.join(this.carpetaCaso, 'resultado.json'), this.resultado);
  }
});
AfterAll(async function () {
  await browser?.close();
});
