import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { generarDashboard, escaparHtml } from '../src/utilities/util_reportes';
import { NAVEGADORES, type Resumen, type ResumenDashboard } from '../src/types/type_ejecucion';

function urlPublica(texto: string): string {
  const url = new URL(texto);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('URL HTTP(S) requerida');
  return `${url.origin}${url.pathname}`;
}

export function resumenPublico(resumen: Resumen): ResumenDashboard {
  const secretos = [
    ...new Set(
      resumen.manifiesto.casos.flatMap((caso) => [caso.datos.usuario, caso.datos.contrasena]),
    ),
  ]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const ocultar = (texto: string) =>
    secretos
      .reduce((valor, secreto) => valor.replaceAll(secreto, '[reservado]'), texto)
      .replace(/https?:\/\/[^\s<>"']+/g, (url) => {
        try {
          return urlPublica(url);
        } catch {
          return '[URL omitida]';
        }
      });
  return {
    manifiesto: {
      inicio: resumen.manifiesto.inicio,
      reporte: resumen.manifiesto.reporte,
      navegadores: resumen.manifiesto.navegadores,
      modo: resumen.manifiesto.modo,
      baseUrl: urlPublica(resumen.manifiesto.baseUrl),
      dryRun: resumen.manifiesto.dryRun,
      casos: resumen.manifiesto.casos.map((caso) => ({
        id: caso.id,
        nombreGherkin: ocultar(caso.nombreGherkin),
        tags: caso.tags.map(ocultar),
      })),
    },
    fin: resumen.fin,
    duracionMs: resumen.duracionMs,
    metricas: resumen.metricas,
    erroresTecnicos: resumen.erroresTecnicos.map(ocultar),
    resultados: resumen.resultados.map((caso) => ({
      tap: caso.tap,
      id: caso.id,
      escenario: ocultar(caso.escenario),
      nombreGherkin: ocultar(caso.nombreGherkin),
      modulo: caso.modulo,
      navegador: caso.navegador,
      estado: caso.estado,
      inicio: caso.inicio,
      duracionMs: caso.duracionMs,
      url: urlPublica(caso.url),
      motivo: caso.motivo ? ocultar(caso.motivo) : undefined,
      error: caso.error ? ocultar(caso.error) : undefined,
      tipoError: caso.tipoError,
      pasos: caso.pasos.map((paso) => ({
        nombre: ocultar(paso.nombre),
        estado: paso.estado,
        duracionMs: paso.duracionMs,
        captura: paso.captura,
        error: paso.error ? ocultar(paso.error) : undefined,
      })),
    })),
  };
}

const celda = (texto: string) =>
  escaparHtml(texto)
    .replaceAll('|', '&#124;')
    .replace(/[\r\n]+/g, ' ');
export function tablaActions(resumen: ResumenDashboard, enlace?: string): string {
  const exito = (passed: number, failed: number) =>
    passed + failed ? `${((passed / (passed + failed)) * 100).toFixed(1)}%` : 'N/A';
  const filas = resumen.manifiesto.navegadores.map((navegador) => {
    const casos = resumen.resultados.filter((caso) => caso.navegador === navegador);
    const contar = (estado: string) => casos.filter((caso) => caso.estado === estado).length;
    return `| ${navegador} | ${casos.length} | ${contar('PASSED')} | ${contar('FAILED')} | ${contar('SKIPPED')} | ${contar('PENDING')} | ${exito(contar('PASSED'), contar('FAILED'))} | ${(casos.reduce((suma, caso) => suma + caso.duracionMs, 0) / 1000).toFixed(2)} s |`;
  });
  const m = resumen.metricas;
  const encabezado = [
    '## Resultados QA - Sauce Demo',
    '',
    `Reporte: **${celda(resumen.manifiesto.reporte)}** · Modo: **${celda(resumen.manifiesto.modo)}**`,
    resumen.manifiesto.dryRun
      ? '**DRY RUN:** validacion Gherkin; no representa pruebas funcionales PASSED.'
      : `**${m.failed || resumen.erroresTecnicos.length ? 'Finalizado con fallos/errores' : 'Finalizado sin fallos registrados'}**`,
    '',
  ];
  if (enlace) encabezado.push(`[Abrir dashboard publicado](${urlPublica(enlace)})`, '');
  return [
    ...encabezado,
    '| Navegador | Seleccionados | PASSED | FAILED | SKIPPED | Pendientes | Exito | Tiempo |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...filas,
    `| **TOTAL** | **${m.seleccionados}** | **${m.passed}** | **${m.failed}** | **${m.skipped}** | **${m.pendientes}** | **${exito(m.passed, m.failed)}** | **${(resumen.duracionMs / 1000).toFixed(2)} s** |`,
    '',
    'Exito = PASSED / (PASSED + FAILED). SKIPPED queda fuera del denominador. Tiempo por navegador: suma de sus casos; TOTAL: tiempo global.',
    ...(resumen.erroresTecnicos.length
      ? [
          '',
          `Errores tecnicos: **${resumen.erroresTecnicos.length}**. Consulte los artefactos de esta corrida.`,
        ]
      : []),
    '',
  ].join('\n');
}

export async function prepararSitio(carpeta: string, destino: string, resumen: Resumen) {
  const publico = resumenPublico(resumen);
  const raiz = await fs.realpath(carpeta);
  const reporte = path.resolve(destino, 'reporte');
  if (
    path.resolve(destino) === path.resolve(carpeta) ||
    path.resolve(carpeta).startsWith(path.resolve(destino) + path.sep)
  )
    throw new Error('El sitio no puede reemplazar el reporte fuente');
  try {
    if ((await fs.readdir(destino)).length)
      throw new Error('Use una carpeta de sitio nueva o vacia');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  // Solo se publican las PNG referenciadas; no se copian logs, trazas, Excel ni manifiestos originales.
  for (const captura of new Set(
    publico.resultados
      .flatMap((caso) => caso.pasos.map((paso) => paso.captura))
      .filter((valor): valor is string => Boolean(valor)),
  )) {
    if (
      !/^navegadores\/(chromium|firefox|webkit)\/escenarios\/TAP-\d{3}\/evidencias\/[\w-]+\.png$/.test(
        captura,
      )
    )
      throw new Error('Ruta de captura no permitida para publicar');
    const origen = await fs.realpath(path.join(raiz, captura));
    if (!origen.startsWith(raiz + path.sep)) throw new Error('Captura fuera del reporte');
    const archivo = path.join(reporte, captura);
    await fs.mkdir(path.dirname(archivo), { recursive: true });
    await fs.copyFile(origen, archivo);
  }
  await generarDashboard(reporte, publico);
  await fs.writeFile(path.join(destino, '.nojekyll'), '');
  await fs.writeFile(
    path.join(destino, 'index.html'),
    '<!doctype html><html lang="es"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=reporte/resumen/dashboard.html"><title>Reporte QA</title><a href="reporte/resumen/dashboard.html">Abrir reporte QA</a></html>',
  );
}

async function ejecutar() {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string' },
      output: { type: 'string', default: 'site' },
      'summary-only': { type: 'boolean' },
      'page-url': { type: 'string' },
    },
  });
  if (!values.dir) throw new Error('Use --dir reports/REPORT_...');
  let resumen: Resumen;
  try {
    resumen = JSON.parse(
      await fs.readFile(path.resolve(values.dir, 'json/resumen.json'), 'utf8'),
    ) as Resumen;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const navegadores =
      process.env.BROWSER === 'all' ? NAVEGADORES : [process.env.BROWSER || 'N/A'];
    const markdown = [
      '## Resultados QA - sin reporte',
      '',
      'La corrida no genero un resumen. Revise los jobs de preparacion, validacion e instalacion.',
      '',
      '| Navegador | Estado |',
      '| --- | --- |',
      ...navegadores.map((navegador) => `| ${celda(navegador)} | Sin resultados disponibles |`),
      '',
      `Jobs: ${celda(process.env.QA_JOB_STATUS || 'Sin informacion')}`,
      '',
    ].join('\n');
    if (process.env.GITHUB_STEP_SUMMARY)
      await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
    else console.log(markdown);
    if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, 'ready=false\n');
    process.exitCode = 1;
    return;
  }
  const publico = resumenPublico(resumen);
  const markdown = tablaActions(publico, values['page-url']);
  if (process.env.GITHUB_STEP_SUMMARY)
    await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, markdown);
  else console.log(markdown);
  if (!values['summary-only'])
    await prepararSitio(path.resolve(values.dir), path.resolve(values.output!), resumen);
  if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, 'ready=true\n');
}
if (require.main === module)
  ejecutar().catch((error) => {
    console.error(`PUBLICACION: ${String(error)}`);
    process.exitCode = 1;
  });
