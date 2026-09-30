import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { NAVEGADORES, type Manifiesto, type Navegador } from '../src/types/type_ejecucion';
import {
  consolidar,
  generarDashboard,
  generarReportesFinales,
} from '../src/utilities/util_reportes';
import { escribirJsonAtomico } from '../src/utilities/util_evidencias';
import { mostrarResumen } from '../src/utilities/util_consola';
async function reunir() {
  const { values } = parseArgs({
    options: {
      dir: { type: 'string' },
      expected: { type: 'string', default: 'chromium,firefox,webkit' },
    },
  });
  if (!values.dir) throw new Error('Use npm run reports:merge -- --dir reports/REPORT_...');
  const carpeta = path.resolve(values.dir);
  const navegadores = values.expected!.split(',') as Navegador[];
  if (
    !navegadores.length ||
    navegadores.some((nombre) => !NAVEGADORES.includes(nombre)) ||
    new Set(navegadores).size !== navegadores.length
  )
    throw new Error('--expected no valido');
  const manifiestos: Manifiesto[] = [];
  const errores: string[] = [];
  for (const navegador of navegadores) {
    try {
      manifiestos.push(
        JSON.parse(
          await fs.readFile(path.join(carpeta, 'json', `seleccion-${navegador}.json`), 'utf8'),
        ),
      );
    } catch (error) {
      errores.push(`Falta manifiesto ${navegador}: ${String(error)}`);
    }
  }
  if (!manifiestos.length) throw new Error('No hay artefactos con manifiestos para consolidar');
  const manifiesto = { ...manifiestos[0], navegadores };
  for (const otro of manifiestos.slice(1))
    if (
      JSON.stringify(otro.casos) !== JSON.stringify(manifiesto.casos) ||
      otro.inicio !== manifiesto.inicio ||
      otro.reporte !== manifiesto.reporte ||
      otro.dryRun !== manifiesto.dryRun
    )
      errores.push('Los artefactos no corresponden a la misma corrida/seleccion');
  await escribirJsonAtomico(path.join(carpeta, 'json', 'seleccion.json'), manifiesto);
  const resumen = await consolidar(carpeta, manifiesto, !manifiesto.dryRun, errores);
  if (manifiesto.dryRun) await generarDashboard(carpeta, resumen);
  else await generarReportesFinales(carpeta, resumen);
  mostrarResumen(resumen);
  process.exitCode = resumen.metricas.failed || errores.length ? 1 : 0;
}
reunir().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
