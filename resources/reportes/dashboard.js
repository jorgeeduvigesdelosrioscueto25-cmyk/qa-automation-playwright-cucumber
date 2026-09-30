/* El JSON incrustado permite abrir el dashboard desde disco sin servidor ni CDN. */
const datos = JSON.parse(document.getElementById('datos').textContent);
const estados = ['PASSED', 'FAILED', 'SKIPPED', 'PENDING'];
const colores = { PASSED: '#12866a', FAILED: '#d14b52', SKIPPED: '#bc861e', PENDING: '#8094a8' };
const esc = (texto) =>
  String(texto ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const ruta = (archivo) => '../' + archivo.split('/').map(encodeURIComponent).join('/');
const segundos = (valor) => `${(valor / 1000).toFixed(2)} s`;
const m = datos.metricas;
document.getElementById('fecha').textContent =
  `${datos.manifiesto.reporte} · ${datos.manifiesto.baseUrl} · Modo ${datos.manifiesto.modo}`;
document.getElementById('cards').innerHTML = [
  ['SELECCIONADOS', m.seleccionados],
  ['PASSED', m.passed],
  ['FAILED', m.failed],
  ['SKIPPED', m.skipped],
  ['PENDIENTES', m.pendientes],
]
  .map(
    ([estado, numero]) =>
      `<div class="card" data-state="${estado}"><span>${estado}</span><strong>${numero}</strong></div>`,
  )
  .join('');
let limite = 0;
const segmentos = estados.map((estado) => {
  const inicio = limite;
  limite +=
    (datos.resultados.filter((caso) => caso.estado === estado).length / (m.seleccionados || 1)) *
    100;
  return `${colores[estado]} ${inicio}% ${limite}%`;
});
document.getElementById('pie').style.background = m.seleccionados
  ? `conic-gradient(${segmentos.join(',')})`
  : '#e0e8ef';
document.getElementById('success').textContent =
  m.tasaExito === null ? 'N/A' : `${m.tasaExito.toFixed(1)}%`;
document.getElementById('legend').innerHTML = estados
  .map(
    (estado) =>
      `<div><span style="background:${colores[estado]}"></span>${estado}: ${datos.resultados.filter((caso) => caso.estado === estado).length}</div>`,
  )
  .join('');
document.getElementById('bars').innerHTML = datos.manifiesto.navegadores
  .map((navegador) => {
    const casos = datos.resultados.filter((caso) => caso.navegador === navegador);
    return `<div class="bar-row"><span>${navegador}</span><div class="bar">${estados.map((estado) => `<i title="${estado}" style="background:${colores[estado]};width:${(casos.filter((caso) => caso.estado === estado).length / (casos.length || 1)) * 100}%"></i>`).join('')}</div><span>${casos.length}</span></div>`;
  })
  .join('');
document.getElementById('foot').textContent =
  `Duracion global: ${segundos(datos.duracionMs)}. TAP unicos: ${datos.manifiesto.casos.length}. Exito = PASSED / (PASSED + FAILED); SKIPPED excluidos. ${datos.fin ? 'Ejecucion finalizada.' : 'Ejecucion en curso: vuelva a cargar para actualizar.'}`;
if (datos.erroresTecnicos.length)
  document.getElementById('errors').innerHTML =
    `<div class="errors"><strong>Errores tecnicos / datos</strong>${datos.erroresTecnicos.map((error) => `<pre>${esc(error)}</pre>`).join('')}</div>`;
for (const [id, valores] of [
  ['modulo', [...new Set(datos.resultados.map((caso) => caso.modulo))]],
  ['navegador', datos.manifiesto.navegadores],
  ['estado', estados],
])
  document.getElementById(id).innerHTML += valores
    .map((valor) => `<option value="${esc(valor)}">${esc(valor)}</option>`)
    .join('');
function pintar() {
  const texto = document.getElementById('caso').value.toLowerCase();
  const casos = datos.resultados.filter(
    (caso) =>
      `${caso.tap} ${caso.escenario}`.toLowerCase().includes(texto) &&
      ['modulo', 'navegador', 'estado'].every(
        (campo) =>
          !document.getElementById(campo).value ||
          caso[campo] === document.getElementById(campo).value,
      ),
  );
  document.getElementById('rows').innerHTML =
    casos
      .map(
        (caso) =>
          `<tr><td><strong>${esc(caso.tap)}</strong></td><td>${esc(caso.escenario)}<br><small>${esc(caso.modulo)} · ID ${caso.id}</small></td><td>${esc(caso.navegador)}</td><td><span class="badge ${caso.estado}">${caso.estado}</span></td><td>${segundos(caso.duracionMs)}</td><td><details><summary>Detalle</summary><div class="detail">${caso.documento ? `<p><a href="${ruta(caso.documento)}">Documento Word</a></p>` : ''}${caso.trace ? `<p><a href="${ruta(caso.trace)}">Traza Playwright</a></p>` : ''}${caso.errorHtml ? `<p><a href="${ruta(caso.errorHtml)}">Detalle del error</a></p>` : ''}${caso.motivo ? `<p>${esc(caso.motivo)}</p>` : ''}${caso.error ? `<pre>${esc(caso.tipoError)}: ${esc(caso.error)}</pre>` : ''}${caso.pasos.map((paso, indice) => `<div class="step"><strong>${indice + 1}. ${esc(paso.nombre)}</strong><br><span class="${paso.estado}">${esc(paso.estado)}</span> · ${segundos(paso.duracionMs)}${paso.error ? `<pre>${esc(paso.error)}</pre>` : ''}${paso.captura ? `<a href="${ruta(paso.captura)}"><img loading="lazy" src="${ruta(paso.captura)}" alt="Evidencia del paso ${indice + 1}"></a>` : ''}</div>`).join('')}</div></details></td></tr>`,
      )
      .join('') || '<tr><td colspan="6" class="empty">Sin resultados para estos filtros.</td></tr>';
  document.getElementById('visible').textContent =
    `${casos.length} de ${datos.resultados.length} ejecuciones`;
}
document
  .querySelectorAll('.filters input,.filters select')
  .forEach((control) => control.addEventListener('input', pintar));
pintar();
