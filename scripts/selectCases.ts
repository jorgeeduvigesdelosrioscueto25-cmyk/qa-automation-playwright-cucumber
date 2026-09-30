import fs from 'node:fs/promises';
import path from 'node:path';
import { generateMessages } from '@cucumber/gherkin';
import { IdGenerator, SourceMediaType, type Scenario, type FeatureChild } from '@cucumber/messages';
import parse from '@cucumber/tag-expressions';
import { DataTestManager, ErrorDatos } from '../config/config_dataTestManager';
import type { CasoSeleccionado } from '../src/types/type_ejecucion';
export async function seleccionarCasos(
  gestor: DataTestManager,
  etiquetas = '',
  taps: string[] = [],
  carpetaFeatures = 'features',
): Promise<CasoSeleccionado[]> {
  const casos: CasoSeleccionado[] = [];
  const expresion = parse(etiquetas || '@web');
  const nombres = new Set<string>();
  const usados = new Set<string>();
  const archivos = (await fs.readdir(carpetaFeatures))
    .filter((nombre) => nombre.endsWith('.feature'))
    .sort();
  for (const archivo of archivos) {
    const uri = path.join(carpetaFeatures, archivo).split(path.sep).join('/');
    const texto = await fs.readFile(uri, 'utf8');
    const sobres = generateMessages(texto, uri, SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN, {
      newId: IdGenerator.uuid(),
      includeGherkinDocument: true,
      includePickles: true,
      includeSource: false,
    });
    const error = sobres.find((sobre) => sobre.parseError)?.parseError;
    if (error) throw new ErrorDatos(`${uri}: ${error.message}`);
    const documento = sobres.find((sobre) => sobre.gherkinDocument)?.gherkinDocument;
    if (!documento?.feature) throw new ErrorDatos(`Feature vacio: ${uri}`);
    const ids = new Map<string, number>();
    const visitar = (hijos: readonly FeatureChild[]) => {
      for (const hijo of hijos) {
        if (hijo.rule) visitar(hijo.rule.children);
        const escenario: Scenario | undefined = hijo.scenario;
        if (!escenario) continue;
        if (
          !escenario.name.startsWith('Validar') ||
          !escenario.examples.length ||
          !escenario.name.includes('<datos>')
        )
          throw new ErrorDatos(`${uri}: use Scenario Outline: Validar ... <datos>`);
        for (const ejemplo of escenario.examples) {
          if (
            ejemplo.tableHeader?.cells.length !== 1 ||
            ejemplo.tableHeader.cells[0].value !== 'datos'
          )
            throw new ErrorDatos(`${uri}: Examples debe tener solo la columna datos`);
          for (const fila of ejemplo.tableBody) {
            const valor = fila.cells[0]?.value;
            if (
              fila.cells.length !== 1 ||
              !/^[1-9]\d*$/.test(valor) ||
              !Number.isSafeInteger(Number(valor))
            )
              throw new ErrorDatos(`${uri}: cada fila datos debe contener un ID entero singular`);
            ids.set(fila.id, Number(valor));
          }
        }
      }
    };
    visitar(documento.feature.children);
    for (const sobre of sobres) {
      if (!sobre.pickle) continue;
      const pickle = sobre.pickle;
      const tags = pickle.tags.map((tag) => tag.name);
      if (!expresion.evaluate(tags)) continue;
      const id = pickle.astNodeIds
        .map((nodo) => ids.get(nodo))
        .find((valor) => valor !== undefined);
      if (id === undefined) throw new ErrorDatos(`No se puede resolver datos: ${pickle.name}`);
      const datos = gestor.resolver(tags, id);
      if (taps.length && !taps.includes(datos.tap)) continue;
      if (nombres.has(pickle.name) || usados.has(datos.tap))
        throw new ErrorDatos(
          `Nombre de escenario o TAP seleccionado duplicado: ${pickle.name}/${datos.tap}`,
        );
      nombres.add(pickle.name);
      usados.add(datos.tap);
      casos.push({
        uri,
        nombreGherkin: pickle.name,
        id,
        tags,
        datos,
        pasos: pickle.steps.map((paso) => paso.text),
      });
    }
  }
  for (const tap of taps)
    if (!usados.has(tap))
      throw new ErrorDatos(
        `${tap} no esta en los Examples seleccionados por etiquetas; el filtro TAP no agrega filas`,
      );
  if (!casos.length)
    throw new ErrorDatos('La seleccion no contiene casos. Revise etiquetas y Examples');
  return casos;
}
