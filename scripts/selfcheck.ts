import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { DataTestManager, ErrorDatos } from '../config/config_dataTestManager';
import { cargarConfiguracion } from '../config/config_environment';
import { seleccionarCasos } from './selectCases';
import { consolidar } from '../src/utilities/util_reportes';
import type { Manifiesto } from '../src/types/type_ejecucion';
import { crearDatos } from './createData';
import { prepararPipeline } from './preparePipeline';
import { resumenPublico, tablaActions, prepararSitio } from './publishReport';
import type { Resumen } from '../src/types/type_ejecucion';
async function comprobarPublicacion(temporal: string, base: Resumen): Promise<number> {
  const resumen = structuredClone(base);
  const password = 'secreto-sintetico-selfcheck';
  resumen.manifiesto.casos[0].datos.usuario = 'usuario-privado-fixture';
  resumen.manifiesto.casos[0].datos.contrasena = password;
  resumen.manifiesto.baseUrl = 'https://usuario:clave@example.com/app?token=privado';
  resumen.resultados[0].estado = 'PASSED';
  resumen.resultados[1].estado = 'FAILED';
  resumen.resultados[2].estado = 'SKIPPED';
  resumen.resultados[1].error = `Fallo de usuario-privado-fixture con ${password}`;
  resumen.resultados[1].trace = 'archivo-privado.zip';
  resumen.resultados[1].documento = 'archivo-privado.docx';
  resumen.metricas = {
    seleccionados: 3,
    passed: 1,
    failed: 1,
    skipped: 1,
    pendientes: 0,
    tasaExito: 50,
  };
  const publico = resumenPublico(resumen);
  assert.equal(JSON.stringify(publico).includes(password), false);
  assert.equal(JSON.stringify(publico).includes('usuario-privado-fixture'), false);
  assert.equal(Object.hasOwn(publico.manifiesto.casos[0], 'datos'), false);
  assert.equal(publico.manifiesto.baseUrl, 'https://example.com/app');
  assert.equal(publico.resultados[1].trace, undefined);
  assert.equal(publico.resultados[1].documento, undefined);
  assert.deepEqual(publico.metricas, resumen.metricas);
  const tabla = tablaActions(publico, 'https://example.com/qa/');
  assert.match(
    tabla,
    /\| \*\*TOTAL\*\* \| \*\*3\*\* \| \*\*1\*\* \| \*\*1\*\* \| \*\*1\*\* \| \*\*0\*\* \| \*\*50\.0%\*\*/,
  );
  assert.match(tabla, /Abrir dashboard publicado/);
  const dry = tablaActions({ ...publico, manifiesto: { ...publico.manifiesto, dryRun: true } });
  assert.match(dry, /DRY RUN/);
  assert.equal(tabla.includes(password), false);
  const captura = `navegadores/chromium/escenarios/${resumen.resultados[0].tap}/evidencias/paso-01.png`;
  await fs.mkdir(path.dirname(path.join(temporal, captura)), { recursive: true });
  await fs.writeFile(
    path.join(temporal, captura),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5XcAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  resumen.resultados[0].pasos = [
    { nombre: 'Paso de fixture', estado: 'PASSED', duracionMs: 1, captura },
  ];
  const destino = path.join(temporal, 'sitio-publico');
  await prepararSitio(temporal, destino, resumen);
  assert.equal(
    (await fs.readFile(path.join(destino, 'reporte/resumen/dashboard.html'), 'utf8')).includes(
      password,
    ),
    false,
  );
  assert.ok((await fs.stat(path.join(destino, 'reporte', captura))).isFile());
  await assert.rejects(prepararSitio(temporal, destino, resumen), /nueva o vacia/);
  resumen.resultados[0].pasos[0].captura = '../fuera.png';
  await assert.rejects(
    prepararSitio(temporal, path.join(temporal, 'sitio-invalido'), resumen),
    /no permitida/,
  );
  return 15;
}
async function comprobarProperties(temporal: string): Promise<number> {
  const archivo = path.join(temporal, 'automation.properties');
  const contenido = [
    'BROWSER=firefox',
    'EXECUTION_MODE=sequential',
    'HEADLESS=false',
    'EXECUTION_LOGS=true',
    'SCREENSHOT_EACH_STEP=false',
    'TRACE_ON_FAILURE=false',
    'CUCUMBER_PARALLEL=2',
    'DATA_FILE=otro/libro.xlsx',
    'TAGS=@happyPath',
    'TAP=TAP-001,TAP-007',
    'DRY_RUN=true',
  ].join('\n');
  await fs.writeFile(archivo, `\uFEFF# fixture\n${contenido}`);
  const config = cargarConfiguracion({}, archivo);
  assert.deepEqual(config.navegadores, ['firefox']);
  assert.equal(config.headless, false);
  assert.equal(config.logs, true);
  assert.equal(config.capturas, false);
  assert.equal(config.trazas, false);
  assert.equal(config.parallel, 2);
  assert.equal(config.dataFile, 'otro/libro.xlsx');
  assert.deepEqual(config.taps, ['TAP-001', 'TAP-007']);
  assert.equal(config.dryRun, true);
  assert.equal(config.tags, '@happyPath');
  assert.equal(config.actionTimeout, 15000);
  const override = cargarConfiguracion(
    { BROWSER: 'chromium', HEADLESS: 'true', TAGS: '', TAP: '' },
    archivo,
  );
  assert.deepEqual(
    [override.browser, override.headless, override.tags, override.taps],
    ['chromium', true, '', []],
  );
  assert.equal(
    cargarConfiguracion(
      { CUCUMBER_WORKER_ID: '0', CUCUMBER_PARALLEL: 'true', CUCUMBER_TOTAL_WORKERS: '2' },
      archivo,
    ).parallel,
    2,
  );
  assert.equal(override.entornoEjecucion.QA_CONFIG_FILE, path.resolve(archivo));
  for (const [flag, valor] of [
    ['HEADLESS', 'si'],
    ['ACTION_TIMEOUT', ''],
    ['CUCUMBER_PARALLEL', '-1'],
    ['TAP', 'TAP-001,TAP-001'],
  ])
    assert.throws(() => cargarConfiguracion({ [flag]: valor }, archivo), new RegExp(flag));
  const pipeline = prepararPipeline({
    QA_CONFIG_FILE: archivo,
    BROWSER: 'all',
  });
  const entornoPipeline = JSON.parse(pipeline.environment);
  assert.deepEqual(JSON.parse(pipeline.matrix), ['chromium', 'firefox', 'webkit']);
  assert.equal(pipeline.mode, 'sequential');
  assert.equal(entornoPipeline.HEADLESS, 'false');
  assert.equal(entornoPipeline.EXECUTION_LOGS, 'true');
  assert.equal(entornoPipeline.QA_CONFIG_FILE, 'config/automation.properties');
  for (const navegador of ['chromium', 'firefox', 'webkit']) {
    const manual = prepararPipeline({ QA_CONFIG_FILE: archivo, INPUT_BROWSER: navegador });
    const flags = JSON.parse(manual.environment);
    assert.deepEqual(JSON.parse(manual.matrix), [navegador]);
    assert.deepEqual(
      [
        manual.mode,
        flags.HEADLESS,
        flags.EXECUTION_LOGS,
        flags.SCREENSHOT_EACH_STEP,
        flags.TRACE_ON_FAILURE,
        flags.CUCUMBER_PARALLEL,
        flags.TAGS,
        flags.TAP,
        flags.DRY_RUN,
      ],
      [
        'sequential',
        'false',
        'true',
        'false',
        'false',
        '2',
        '@happyPath',
        'TAP-001,TAP-007',
        'true',
      ],
    );
  }
  assert.equal(prepararPipeline({ QA_CONFIG_FILE: archivo, INPUT_BROWSER: '' }).browser, 'firefox');
  assert.throws(
    () => prepararPipeline({ QA_CONFIG_FILE: archivo, INPUT_BROWSER: 'inexistente' }),
    /BROWSER no valido/,
  );
  for (const texto of ['BROWSER=all\nBROWSER=chromium', 'HEADLES=true', 'BROWSER:all']) {
    await fs.writeFile(archivo, texto);
    assert.throws(() => cargarConfiguracion({}, archivo), /Properties/);
  }
  return 34;
}
async function comprobar() {
  const temporal = await fs.mkdtemp(path.resolve('work-selfcheck-'));
  let verificaciones = 0;
  try {
    verificaciones += await comprobarProperties(temporal);
    const archivoBase = path.join(temporal, 'fixture.xlsx');
    await crearDatos(archivoBase);
    const carpetaFeatures = path.join(temporal, 'features');
    await fs.mkdir(carpetaFeatures);
    const idsPorHoja: Record<string, number[]> = {
      home: [1, 2],
      loginNegativo: [1, 2, 3, 4],
      productos: [1, 2],
      carrito: [1],
      compra: [1, 2],
      compraNegativo: [1, 2, 3],
    };
    for (const [hoja, ids] of Object.entries(idsPorHoja)) {
      await fs.writeFile(
        path.join(carpetaFeatures, `${hoja}.feature`),
        `@web @xc-DataTest @${hoja}\nFeature: Seleccion ${hoja}\n  Scenario Outline: Validar seleccion ${hoja} con datos <datos>\n    Given que el usuario accede a Sauce Demo\n    Examples:\n      | datos |\n${ids.map((id) => `      | ${id} |`).join('\n')}\n`,
      );
    }
    const gestor = new DataTestManager(archivoBase);
    await gestor.inicializar();
    const casos = await seleccionarCasos(gestor, '', [], carpetaFeatures);
    assert.equal(casos.length, 14);
    assert.equal(casos.filter((caso) => caso.datos.ejecutar).length, 13);
    assert.equal(casos.find((caso) => caso.datos.tap === 'TAP-014')!.datos.ejecutar, false);
    assert.equal(
      casos.some((caso) => caso.datos.tap === 'TAP-015'),
      false,
    );
    verificaciones += 4;
    assert.equal((await seleccionarCasos(gestor, '@compra', [], carpetaFeatures)).length, 2);
    assert.deepEqual(
      (await seleccionarCasos(gestor, '', ['TAP-008'], carpetaFeatures))[0].datos.productos,
      ['Sauce Labs Backpack', 'Sauce Labs Bike Light'],
    );
    verificaciones += 2;
    await assert.rejects(seleccionarCasos(gestor, '', ['TAP-015'], carpetaFeatures), ErrorDatos);
    verificaciones++;
    assert.throws(() => gestor.resolver(['@xc-DataTest', '@home'], 999), ErrorDatos);
    assert.throws(() => gestor.resolver(['@home'], 1), ErrorDatos);
    assert.throws(() => gestor.resolver(['@xc-DataTest', '@home', '@compra'], 1), ErrorDatos);
    verificaciones += 3;
    assert.equal(gestor.resolver(['@xc-DataTest', '@compraNegativo'], 1).nombre, '');
    assert.equal(gestor.resolver(['@xc-DataTest', '@loginNegativo'], 3).usuario, '');
    verificaciones += 2;
    const cambios: [string, (libro: ExcelJS.Workbook) => void, RegExp][] = [
      [
        'tap-duplicado',
        (libro) => {
          libro.getWorksheet('compra')!.getCell('B2').value = 'TAP-001';
        },
        /TAP duplicado/,
      ],
      [
        'tap-hueco',
        (libro) => {
          libro.getWorksheet('home')!.getCell('B4').value = 'TAP-020';
        },
        /correlativos/,
      ],
      [
        'id-duplicado',
        (libro) => {
          libro.getWorksheet('home')!.getCell('A3').value = 1;
        },
        /ID duplicado/,
      ],
      [
        'ejecutar-invalido',
        (libro) => {
          libro.getWorksheet('home')!.getCell('C2').value = 'QUIZAS';
        },
        /SI o NO/,
      ],
      [
        'columna-ausente',
        (libro) => {
          libro.getWorksheet('home')!.getCell('A1').value = 'OTRO';
        },
        /Falta columna ID/,
      ],
    ];
    for (const [nombre, cambiar, esperado] of cambios) {
      const libro = new ExcelJS.Workbook();
      await libro.xlsx.readFile(archivoBase);
      cambiar(libro);
      const archivo = path.join(temporal, `${nombre}.xlsx`);
      await libro.xlsx.writeFile(archivo);
      await assert.rejects(new DataTestManager(archivo).inicializar(), esperado);
      verificaciones++;
    }
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.readFile(archivoBase);
    libro.getWorksheet('home')!.getCell('F2').value = '';
    const archivo = path.join(temporal, 'dato-obligatorio.xlsx');
    await libro.xlsx.writeFile(archivo);
    const datosInvalidos = new DataTestManager(archivo);
    await datosInvalidos.inicializar();
    assert.throws(
      () => datosInvalidos.resolver(['@xc-DataTest', '@home'], 1),
      /Dato obligatorio vacio/,
    );
    verificaciones++;
    const previo = process.env.BROWSER;
    process.env.BROWSER = 'invalido';
    try {
      assert.throws(cargarConfiguracion, /BROWSER/);
      verificaciones++;
    } finally {
      if (previo === undefined) delete process.env.BROWSER;
      else process.env.BROWSER = previo;
    }
    const manifiesto: Manifiesto = {
      inicio: new Date().toISOString(),
      reporte: 'SELF_CHECK',
      navegadores: ['chromium', 'firefox', 'webkit'],
      modo: 'parallel',
      baseUrl: 'https://www.saucedemo.com/',
      casos: casos.slice(0, 1),
      dryRun: false,
    };
    const sinResultados = await consolidar(temporal, manifiesto, true);
    assert.equal(sinResultados.metricas.seleccionados, 3);
    assert.equal(sinResultados.metricas.failed, 3);
    assert.ok(sinResultados.resultados.every((caso) => caso.tipoError === 'INFRAESTRUCTURA'));
    verificaciones += 3;
    const resultado = sinResultados.resultados[0];
    resultado.estado = 'SKIPPED';
    resultado.motivo = 'EJECUTAR=NO';
    const ruta = path.join(temporal, 'navegadores/chromium/escenarios', resultado.tap);
    await fs.mkdir(ruta, { recursive: true });
    await fs.writeFile(path.join(ruta, 'resultado.json'), JSON.stringify(resultado));
    const conSkip = await consolidar(temporal, manifiesto, true);
    assert.equal(conSkip.metricas.skipped, 1);
    assert.equal(conSkip.metricas.failed, 2);
    assert.equal(conSkip.metricas.tasaExito, 0);
    verificaciones += 3;
    verificaciones += await comprobarPublicacion(temporal, conSkip);
    console.log(
      `Selfcheck: ${verificaciones} comprobaciones de seleccion, datos, configuracion, consolidacion y publicacion correctas.`,
    );
  } finally {
    await fs.rm(temporal, { recursive: true, force: true });
  }
}
comprobar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
