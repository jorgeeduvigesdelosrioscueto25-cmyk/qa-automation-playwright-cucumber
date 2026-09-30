import type { Resumen } from '../types/type_ejecucion';
export function mostrarResumen(resumen: Resumen) {
  const m = resumen.metricas;
  console.log(
    `CASOS SELECCIONADOS: ${m.seleccionados} | PASARON: ${m.passed} | FALLARON: ${m.failed} | OMITIDOS: ${m.skipped} | FALTAN: ${m.pendientes}`,
  );
  for (const navegador of resumen.manifiesto.navegadores) {
    const casos = resumen.resultados.filter((caso) => caso.navegador === navegador);
    console.log(
      `  ${navegador}: ${casos.filter((caso) => caso.estado === 'PASSED').length} PASSED / ${casos.filter((caso) => caso.estado === 'FAILED').length} FAILED / ${casos.filter((caso) => caso.estado === 'SKIPPED').length} SKIPPED / ${casos.filter((caso) => caso.estado === 'PENDING').length} PENDING`,
    );
  }
  console.log(
    `TAP unicos seleccionados: ${resumen.manifiesto.casos.length} | Exito: ${m.tasaExito === null ? 'N/A' : `${m.tasaExito.toFixed(1)}%`}`,
  );
}
