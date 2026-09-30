import fs from 'node:fs/promises';
import path from 'node:path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  ImageRun,
  HeadingLevel,
} from 'docx';
import type { Manifiesto, ResultadoCaso, Resumen, ResumenDashboard } from '../types/type_ejecucion';
import { escribirJsonAtomico } from './util_evidencias';
export const escaparHtml = (texto: string) =>
  texto.replace(
    /[&<>"']/g,
    (letra) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[letra]!,
  );
export function pendientes(manifiesto: Manifiesto): ResultadoCaso[] {
  return manifiesto.navegadores.flatMap((navegador) =>
    manifiesto.casos.map((caso) => ({
      tap: caso.datos.tap,
      id: caso.id,
      escenario: caso.datos.escenario,
      nombreGherkin: caso.nombreGherkin,
      modulo: caso.datos.hoja,
      navegador,
      estado: 'PENDING' as const,
      inicio: manifiesto.inicio,
      duracionMs: 0,
      url: manifiesto.baseUrl,
      pasos: [],
    })),
  );
}
export async function consolidar(
  carpeta: string,
  manifiesto: Manifiesto,
  final = false,
  erroresTecnicos: string[] = [],
): Promise<Resumen> {
  const resultados = pendientes(manifiesto);
  for (let indice = 0; indice < resultados.length; indice++) {
    const esperado = resultados[indice];
    const archivo = path.join(
      carpeta,
      'navegadores',
      esperado.navegador,
      'escenarios',
      esperado.tap,
      'resultado.json',
    );
    try {
      const resultado = JSON.parse(await fs.readFile(archivo, 'utf8')) as ResultadoCaso;
      if (
        resultado.tap !== esperado.tap ||
        resultado.navegador !== esperado.navegador ||
        resultado.id !== esperado.id
      )
        throw new Error(`Resultado no corresponde a ${esperado.tap}/${esperado.navegador}`);
      resultados[indice] = resultado;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        erroresTecnicos = [...erroresTecnicos, String(error)];
      if (final)
        resultados[indice] = {
          ...esperado,
          estado: 'FAILED',
          tipoError: 'INFRAESTRUCTURA',
          error:
            'El proceso de Cucumber termino sin registrar este caso. Consulte el log del navegador.',
          pasos: manifiesto.casos
            .find((caso) => caso.datos.tap === esperado.tap)!
            .pasos.map((nombre) => ({ nombre, estado: 'SKIPPED', duracionMs: 0 })),
        };
    }
  }
  const contar = (estado: string) => resultados.filter((caso) => caso.estado === estado).length;
  const passed = contar('PASSED');
  const failed = contar('FAILED');
  return {
    manifiesto,
    fin: final ? new Date().toISOString() : undefined,
    duracionMs: Date.now() - new Date(manifiesto.inicio).getTime(),
    resultados,
    erroresTecnicos: [...new Set(erroresTecnicos)],
    metricas: {
      seleccionados: resultados.length,
      passed,
      failed,
      skipped: contar('SKIPPED'),
      pendientes: contar('PENDING'),
      tasaExito: passed + failed ? (passed / (passed + failed)) * 100 : null,
    },
  };
}
export async function generarDashboard(carpeta: string, resumen: ResumenDashboard) {
  const destino = path.join(carpeta, 'resumen');
  await fs.mkdir(path.join(destino, 'assets'), { recursive: true });
  for (const archivo of ['styles.css', 'dashboard.js'])
    await fs.copyFile(
      path.resolve('resources/reportes', archivo),
      path.join(destino, 'assets', archivo),
    );
  const datos = JSON.stringify(resumen).replaceAll('<', '\\u003c');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA Automation · Sauce Demo</title><link rel="stylesheet" href="assets/styles.css"></head><body><header><p>QA AUTOMATION / SAUCE DEMO</p><h1>Resultados de pruebas web</h1><p id="fecha"></p></header><main><div id="errors"></div><section id="cards" class="cards" aria-label="Metricas globales"></section><section class="charts"><div class="panel"><h2>Distribucion de resultados</h2><div class="distribution"><div class="pie" id="pie"><div><span><strong id="success"></strong><br>Exito</span></div></div><div class="legend" id="legend"></div></div></div><div class="panel"><h2>Resultados por navegador</h2><div id="bars"></div></div></section><section class="panel"><h2>Casos de prueba</h2><div class="filters"><label>Modulo<select id="modulo"><option value="">Todos</option></select></label><label>Buscar TAP o caso<input id="caso" placeholder="TAP-007 o compra"></label><label>Navegador<select id="navegador"><option value="">Todos</option></select></label><label>Estado<select id="estado"><option value="">Todos</option></select></label></div><p id="visible" class="foot"></p><div class="table-wrap"><table><thead><tr><th>TAP</th><th>Escenario</th><th>Navegador</th><th>Estado</th><th>Duracion</th><th>Detalle</th></tr></thead><tbody id="rows"></tbody></table></div></section><p class="foot" id="foot"></p></main><script id="datos" type="application/json">${datos}</script><script src="assets/dashboard.js"></script></body></html>`;
  await fs.writeFile(path.join(destino, 'dashboard.html'), html);
  await escribirJsonAtomico(path.join(carpeta, 'json', 'resumen.json'), resumen);
}
async function generarWord(carpeta: string, caso: ResultadoCaso) {
  const parrafo = (texto: string, negrita = false) =>
    new Paragraph({
      children: [new TextRun({ text: texto, bold: negrita })],
      spacing: { after: 140 },
    });
  const datos = [
    ['TAP', caso.tap],
    ['Escenario', caso.escenario],
    ['Navegador', caso.navegador],
    ['URL', caso.url],
    ['Fecha de inicio (UTC)', caso.inicio],
    ['Duracion', `${(caso.duracionMs / 1000).toFixed(2)} segundos`],
    ['Estado', caso.estado],
    ['Modulo / ID Excel', `${caso.modulo} / ${caso.id}`],
  ];
  const tabla = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: datos.map(
      ([etiqueta, valor]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [parrafo(etiqueta, true)],
              shading: { fill: 'EFF4F8' },
            }),
            new TableCell({
              width: { size: 75, type: WidthType.PERCENTAGE },
              children: [parrafo(valor)],
            }),
          ],
        }),
    ),
  });
  const contenido: (Paragraph | Table)[] = [
    new Paragraph({ text: 'Reporte de caso de prueba', heading: HeadingLevel.TITLE }),
    parrafo('Sauce Demo · Automatizacion funcional web'),
    tabla,
  ];
  if (caso.motivo) contenido.push(parrafo(`Motivo: ${caso.motivo}`));
  if (caso.error)
    contenido.push(parrafo(`Tipo de error: ${caso.tipoError || 'FUNCIONAL'}`), parrafo(caso.error));
  for (const [indice, paso] of caso.pasos.entries()) {
    contenido.push(
      new Paragraph({
        text: `Paso ${indice + 1}`,
        heading: HeadingLevel.HEADING_1,
        pageBreakBefore: caso.estado !== 'SKIPPED',
      }),
      parrafo(paso.nombre, true),
      parrafo(`Estado: ${paso.estado} · Duracion: ${(paso.duracionMs / 1000).toFixed(2)} segundos`),
    );
    if (paso.error) contenido.push(parrafo(paso.error));
    if (paso.captura)
      contenido.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              type: 'png',
              data: await fs.readFile(path.join(carpeta, paso.captura)),
              transformation: { width: 600, height: 338 },
              altText: {
                title: `Paso ${indice + 1}`,
                description: paso.nombre,
                name: `Evidencia ${indice + 1}`,
              },
            }),
          ],
        }),
      );
  }
  const documento = new Document({
    title: `${caso.tap} - ${caso.navegador}`,
    creator: 'QA Automation',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '17324D' },
          paragraph: { spacing: { after: 160 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1000, bottom: 1000, left: 900, right: 900 },
          },
        },
        children: contenido,
      },
    ],
  });
  caso.documento = `navegadores/${caso.navegador}/escenarios/${caso.tap}/reporte.docx`;
  const destino = path.join(carpeta, caso.documento);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  await fs.writeFile(destino, await Packer.toBuffer(documento));
}
export async function generarReportesFinales(carpeta: string, resumen: Resumen) {
  for (const caso of resumen.resultados) {
    await generarWord(carpeta, caso);
    if (caso.estado === 'FAILED') {
      caso.errorHtml = `navegadores/${caso.navegador}/escenarios/${caso.tap}/error-report.html`;
      await fs.writeFile(
        path.join(carpeta, caso.errorHtml),
        `<!doctype html><html lang="es"><meta charset="utf-8"><title>${caso.tap} · Error</title><style>body{font:16px/1.5 Arial;max-width:1000px;margin:40px auto;padding:20px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#fff0f0;padding:20px}</style><h1>${caso.tap} · ${caso.navegador}</h1><p>${escaparHtml(caso.escenario)}</p><p>Tipo: ${caso.tipoError}</p><pre>${escaparHtml(caso.error || '')}</pre>${caso.pasos
          .filter((paso) => paso.estado === 'FAILED')
          .map(
            (paso) =>
              `<h2>Paso fallido: ${escaparHtml(paso.nombre)}</h2><pre>${escaparHtml(paso.error || '')}</pre>`,
          )
          .join('')}</html>`,
      );
    }
    await escribirJsonAtomico(
      path.join(carpeta, 'navegadores', caso.navegador, 'escenarios', caso.tap, 'resultado.json'),
      caso,
    );
  }
  await generarDashboard(carpeta, resumen);
}
