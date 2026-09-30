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
    INPUT_BROWSER: 'all',
    INPUT_MODE: 'parallel',
    INPUT_HEADLESS: 'true',
    INPUT_LOGS: 'properties',
  });
  const entornoPipeline = JSON.parse(pipeline.environment);
  assert.deepEqual(JSON.parse(pipeline.matrix), ['chromium', 'firefox', 'webkit']);
  assert.equal(pipeline.mode, 'parallel');
  assert.equal(entornoPipeline.HEADLESS, 'true');
  assert.equal(entornoPipeline.EXECUTION_LOGS, 'true');
  assert.equal(entornoPipeline.QA_CONFIG_FILE, 'config/automation.properties');
  for (const texto of ['BROWSER=all\nBROWSER=chromium', 'HEADLES=true', 'BROWSER:all']) {
    await fs.writeFile(archivo, texto);
    assert.throws(() => cargarConfiguracion({}, archivo), /Properties/);
  }
  return 26;
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
    console.log(
      `Selfcheck: ${verificaciones} comprobaciones de seleccion, datos, configuracion y consolidacion correctas.`,
    );
  } finally {
    await fs.rm(temporal, { recursive: true, force: true });
  }
}
comprobar().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
