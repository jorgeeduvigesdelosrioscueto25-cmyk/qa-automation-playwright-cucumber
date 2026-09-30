QA AUTOMATION - PLAYWRIGHT + CUCUMBER - SAUCE DEMO
Version 2.1

Proyecto TypeScript de pruebas FrontEnd con Playwright, Cucumber, Page Object
Model y datos Excel. Cucumber es el unico ejecutor de escenarios;
@playwright/test se utiliza exclusivamente para sus aserciones expect.

1. INSTALACION Y EJECUCION

Requisito: Node.js 22.13+ o 24 con npm. El ZIP incluye codigo y datos; las
dependencias y los navegadores se instalan en tu equipo. Necesitas Internet
para la primera instalacion y para acceder a https://www.saucedemo.com/.

Windows (CMD o PowerShell), desde la carpeta del proyecto:

  npm.cmd ci
  npx.cmd playwright install chromium firefox webkit
  npm.cmd run validate
  npm.cmd test

EJECUTAR.cmd realiza esos mismos pasos y admite argumentos adicionales.
Si ya instalaste las dependencias y navegadores, basta con npm.cmd test.
Usamos npm.cmd para evitar el bloqueo de npm.ps1 por la politica de PowerShell.
No necesitas modificar la politica de ejecucion de Windows.

Linux/macOS:

  bash ejecutar.sh

Instalacion manual Linux/CI: npm ci y npx playwright install --with-deps.
Despues npm run validate y npm test. En Linux el modo con ventana requiere
una pantalla disponible; el pipeline utiliza xvfb-run cuando HEADLESS=false.

2. UN SOLO ARCHIVO PARA LOS FLAGS

Edita config/automation.properties. Se utiliza tanto localmente como en CI.
Formato UTF-8 CLAVE=valor, sin comillas. Los comentarios # o ! deben ocupar
una linea propia. Se preservan URLs y rutas literales; no hay interpolacion,
continuacion de lineas ni escapes Java. Claves repetidas/desconocidas y valores
invalidos detienen la ejecucion con un mensaje y codigo 1.

Prioridad: argumentos del comando > variables de entorno > properties > defaults.
El archivo debe existir. No es necesario crear .env; ya no se utiliza dotenv.
Para otro archivo: npm.cmd test -- --config "ruta/automation.properties".
Tambien puedes definir la variable QA_CONFIG_FILE.

Flag                  Default                         Significado
BASE_URL              https://www.saucedemo.com/      Aplicacion bajo prueba
BROWSER               all                             chromium/firefox/webkit/all
EXECUTION_MODE        parallel                        parallel/sequential entre motores
HEADLESS              true                            false muestra la ventana local
CUCUMBER_PARALLEL     0                               Workers por motor; 0 secuencial
EXECUTION_LOGS        false                           Mostrar logs detallados de Cucumber
SCREENSHOT_EACH_STEP  true                            Captura de cada paso
TRACE_ON_FAILURE      true                            Guardar trace.zip al fallar
ACTION_TIMEOUT        15000                           Limite de acciones/navegacion en ms
ASSERTION_TIMEOUT     10000                           Limite de aserciones en ms
SCENARIO_TIMEOUT      120000                          Limite de cada paso/hook en ms
REPORT_TIMEZONE       America/Lima                    Zona del nombre de carpeta
DATA_FILE             resources/data/xc-DataTest.xlsx Ruta del Excel
TAGS                  (vacio)                         Expresion de etiquetas Cucumber
TAP                   (vacio)                         Lista TAP-001,TAP-007
DRY_RUN               false                           Validar Gherkin sin navegador

Booleanos: true/false. Workers: entero >= 0. Timeouts: enteros >= 1.
EXECUTION_LOGS=false conserva el resumen/progreso y guarda el log en disco.
SCREENSHOT_EACH_STEP=false omite capturas rutinarias; un fallo conserva su
captura de error cuando existe pagina. TRACE_ON_FAILURE=false desactiva trazas.
Los timeouts son limites, no pausas. No se usan sleeps en los flujos web.

Ejemplo para abrir Chromium con ventana y mostrar logs:

  BROWSER=chromium
  HEADLESS=false
  EXECUTION_LOGS=true

Guarda esos valores en properties y ejecuta: npm.cmd test
El Excel y la seleccion se preparan antes de abrir los procesos. Los flags
efectivos se transmiten a todos los procesos/workers de la misma corrida.

3. COMANDOS Y ESCENARIOS INDEPENDIENTES

  npm.cmd test -- --browser chromium --tags "@happyPath"
  npm.cmd test -- --browser chromium --tap TAP-001
  npm.cmd test -- --browser chromium --tap TAP-001,TAP-007
  npm.cmd test -- --tags "@compra or @carrito"
  npm.cmd test -- --browser all --mode sequential
  npm.cmd test -- --browser all --mode parallel
  npm.cmd test -- --browser chromium --scenario-parallel 2
  npm.cmd test -- --browser chromium --headed
  npm.cmd test -- --headless true --logs false --screenshots false --trace false
  npm.cmd run test:smoke -- --browser chromium
  npm.cmd run test:regression -- --browser chromium
  npm.cmd run test:happy -- --browser chromium
  npm.cmd run test:unhappy -- --browser chromium
  npm.cmd run test:dry -- --browser chromium

--tags acepta expresiones Cucumber; --tap acepta identificadores TAP-###.
--tags repetidos se combinan con AND. Los filtros tags y TAP se combinan.
Un TAP fuera de la seleccion genera un error; no se ejecuta fuera de Examples.
Los argumentos sustituyen el filtro del archivo, no se agregan a ese filtro.
Para limpiar un filtro del archivo: --tags "" o --tap "".
--headed equivale a HEADLESS=false; no se combina con --headless.
DRY_RUN/test:dry valida definiciones y seleccion sin hooks ni navegadores;
no representa pruebas PASSED ni produce reportes Word de ejecucion funcional.

4. DATOS EXCEL Y GHERKIN

El unico lector del libro es config/config_dataTestManager.ts. Hooks carga
el manifiesto preparado por el orquestador; Steps y Pages no consultan Excel.

@xc-DataTest identifica el libro y @compra identifica la hoja. En el Feature:

  Examples:
    | datos |
    | 1     |
    | 2     |

datos=2 selecciona ID=2 de esa hoja. ID puede repetirse en otras hojas;
TAP es unico y correlativo globalmente desde TAP-001. Cada Examples usa un
solo ID por fila; no se admiten ALL, intervalos o listas en la celda.

ID en Examples + EJECUTAR=SI: se ejecuta.
ID en Examples + EJECUTAR=NO: SKIPPED antes de abrir navegador/contexto.
ID fuera de Examples: no seleccionado y fuera de las metricas.
ID inexistente o dato invalido: error de datos y salida 1.

Hojas: home, loginNegativo, productos, carrito, compra y compraNegativo.
Columnas comunes: ID, TAP, EJECUTAR, ESCENARIO, RESULTADO ESPERADO.
Columnas funcionales: USUARIO, CONTRASENA, PRODUCTOS, NOMBRE, APELLIDO,
CODIGO_POSTAL, MENSAJE_ESPERADO, CAMPO_VACIO.
EJECUTAR admite SI/NO, ignorando mayusculas y espacios externos. SI sin tilde.
CAMPO_VACIO identifica el unico campo intencionalmente vacio del caso negativo.
Los demas campos obligatorios se validan antes de ejecutar, tambien con NO.
No se aceptan formulas ni errores Excel en los datos.
PRODUCTOS contiene nombres exactos separados por |.

Cobertura inicial (si conservas el libro y los Features incluidos):
TAP-001 home/1: login valido, URL inventory y titulo Products.
TAP-002 loginNegativo/1: credenciales incorrectas.
TAP-003 loginNegativo/2: usuario bloqueado.
TAP-004 productos/1: agregar un producto, Remove y contador.
TAP-005 productos/2: agregar varios productos y contador.
TAP-006 carrito/1: nombres, cantidades y precios.
TAP-007 compra/1: compra de un producto, resumen y confirmacion.
TAP-008 compra/2: compra de varios productos, resumen y confirmacion.
TAP-009 compraNegativo/1: nombre obligatorio.
TAP-010 compraNegativo/2: apellido obligatorio.
TAP-011 compraNegativo/3: codigo postal obligatorio.
TAP-012 loginNegativo/3: usuario obligatorio.
TAP-013 loginNegativo/4: contrasena obligatoria.
TAP-014 home/2: NO, seleccionado y omitido.
TAP-015 home/3: SI fuera de Examples, fuera de metricas.

Seleccion completa: 14 TAP por navegador, 13 habilitados y 1 SKIPPED.
Con all: 42 combinaciones, 39 habilitadas y 3 SKIPPED.
Smoke cubre login y compra; regression contiene toda la seleccion.
Carrito y compra comprueban nombres, cantidades, precios, subtotal, impuesto
del 8% redondeado a centavos y total. Cada caso tiene sus propios datos.

Para ampliar cobertura agrega el siguiente TAP y el ID en Examples. Un modulo
nuevo requiere registrar hoja, columnas y validacion en DataTestManager.
npm.cmd run data:create restaura el libro inicial y SOBRESCRIBE tus cambios.
Los cambios del Excel durante una corrida se aplican a la siguiente.

5. ESTRUCTURA Y ESTRATEGIA

.github/workflows/ci_web.yml      Pipeline GitHub Actions
config/automation.properties     Flags locales y CI
config/                         Navegador, datos, entorno y reportes
features/*.feature              Features sin subcarpetas
src/pages/page_*.ts              Acciones y aserciones POM
src/locators/locator_*.ts         Selectores centralizados
src/steps/step_*.ts              Pasos de negocio
src/support/                    CustomWorld y Hooks
src/types/                      Tipos de resultados y datos
src/utilities/                  Evidencias, aserciones y reportes
resources/data/xc-DataTest.xlsx  Datos editables
resources/reportes/             Plantillas HTML/CSS/JS locales
scripts/                        Ejecucion, datos, validacion y consolidacion
reports/                        Se crea automaticamente; ignorado por Git
README.txt                      Unica documentacion TXT del proyecto
EJECUTAR.cmd / ejecutar.sh       Instalacion y ejecucion

Cada escenario crea un BrowserContext limpio; los workers pueden compartir
Browser, pero no sesiones. Los flujos preparan su propio login/carrito.
After cierra el contexto y AfterAll cierra el navegador. Pages desconoce TAP,
Excel y reportes. CustomWorld concentra el estado del caso. Los localizadores
usan roles/test-id y contenedores estables, con autoesperas y expect.
El objetivo es cobertura funcional FrontEnd; no incluye API, mobile, carga
ni seguridad. No hay reintentos automaticos para ocultar fallos.

.gitignore es la unica fuente de exclusiones para Git, Prettier y ESLint.
El contenido anterior de .prettierignore se integro alli; se retiro ese archivo.
package-lock.json y resources/data/*.xlsx tienen excepciones explicitas para
mantenerlos versionados: el pipeline necesita el lockfile y los datos.
Prettier usa --ignore-path .gitignore --ignore-unknown, por lo que omite tipos
sin formateador como XLSX, TXT y properties. No ignores todo config/.

6. REPORTES Y CODIGOS DE SALIDA

Cada corrida reserva reports/REPORT_YYYY-MM-DD_HH-MM-SS/ sin sobrescribir.
Abre resumen/dashboard.html en esa carpeta, indicada al terminar.
Incluye metricas, graficos, tiempos, filtros y detalle por paso; funciona desde
disco sin CDN ni servidor. Recarga durante la corrida para ver el progreso.
JSON: json/resumen.json y manifiestos; cada motor conserva Cucumber JSON,
messages NDJSON y cucumber.log.
Word: navegadores/<motor>/escenarios/<TAP>/reporte.docx, con pasos y evidencias.
FAILED conserva error-report.html, captura de error y traza cuando es posible.
SKIPPED explica el motivo y no produce capturas. Un navegador que no inicia
no puede generar una captura de pagina.

Abrir una traza: npx.cmd playwright show-trace "ruta/trace.zip".
HTML, Word y consola usan los mismos resultados consolidados.
Exito = PASSED / (PASSED + FAILED); SKIPPED no entra en el denominador.
Se distinguen fallos funcionales, de infraestructura y de configuracion/datos.
Salida 0: corrida sin fallos; salida 1: fallo o error tecnico/datos/configuracion.
Los otros navegadores terminan aunque falle uno. Los resultados faltantes de
procesos terminados se registran como FAILED/INFRAESTRUCTURA.

7. PIPELINE GITHUB ACTIONS

Push/PR a main: utiliza los valores versionados de automation.properties.
Ejecucion manual: browser, execution_mode, headless, logs, screenshots, trace,
workers, tags, tap y dry_run. El valor properties conserva el archivo.
Las entradas manuales sustituyen los flags de esa corrida. Para limpiar un filtro
del archivo escribe none en tags o tap al iniciar el pipeline manualmente.

Preparar instala npm ci y utiliza el MISMO cargador de properties que el runner.
Genera matriz y una copia de los flags efectivos para todos los jobs.
all+parallel crea tres jobs, max-parallel=3 y fail-fast=false.
all+sequential ejecuta los motores en orden dentro de un job.
Un solo motor crea una sola ejecucion. Cada job valida codigo e instala su
navegador con --with-deps. HEADLESS=false utiliza una pantalla virtual Xvfb;
no abre una ventana en tu escritorio. Los logs aparecen en GitHub si estan
habilitados y se guardan en los artefactos en ambos modos.
La etapa final consolida los artefactos de ejecucion paralela o secuencial.
Los artefactos se conservan 14 dias, incluso ante errores. Un artefacto ausente
se informa como fallo de infraestructura. Dry run conserva dashboard/manifiestos
sin convertir escenarios pendientes en fallos funcionales.

Para habilitarlo: sube el proyecto (incluidos properties, lockfile y Excel) a
tu repositorio GitHub en main. Actions detecta .github/workflows/ci_web.yml.
No subas node_modules/ ni reports/. No incluyas secretos en properties; usa
el almacen de secretos del proveedor si cambias a una aplicacion que los use.

PUBLICACION DEL DASHBOARD Y TABLA FINAL

En el repositorio: Settings > Pages > Build and deployment > Source: GitHub Actions.
Esta configuracion se realiza una sola vez. No necesitas crear un token ni un
secret de publicacion: el job publicar usa el token automatico de Actions con
pages: write e id-token: write. El resto del workflow solo solicita contents: read.

Al terminar, el job consolidar escribe una tabla en el Summary de la corrida:
navegador, seleccionados, PASSED, FAILED, SKIPPED, pendientes, exito y tiempo.
El job publicar repite la tabla y agrega el enlace real devuelto por GitHub Pages.
Se generan tabla y reporte aunque fallen escenarios; la corrida conserva su
estado de fallo. Si no hay resultados, el Summary informa que no existe reporte.

Push a main o ejecucion manual desde main publica la ultima corrida en Pages.
Los PR conservan tabla y artefactos sin reemplazar el sitio publicado.
El enlace del sitio muestra la ultima corrida publicada, sin historial de sitios.

El sitio contiene HTML, CSS, JavaScript, JSON resumido y PNG referenciadas.
Los datos de credenciales se retiran del manifiesto web; se ocultan las
credenciales conocidas del Excel en mensajes y se eliminan credenciales/query
de las URLs mostradas. Logs, trazas, Word y manifiestos completos permanecen
en los artefactos de Actions, y no se copian a Pages. Las capturas muestran los
datos visibles de la aplicacion: este proyecto publica datos de Sauce Demo.

Prueba local (usa una carpeta de destino nueva o vacia):
  npm.cmd run reports:publish -- --dir reports/REPORT_... --output site
  npm.cmd run reports:publish -- --dir reports/REPORT_... --summary-only
El primer comando construye site/index.html; site/ se ignora por Git.
El segundo solo imprime la tabla; en Actions escribe GITHUB_STEP_SUMMARY.
La publicacion remota requiere una corrida con Pages habilitado.

8. VALIDACION Y SOLUCION DE PROBLEMAS

  npm.cmd run validate

Incluye TypeScript, ESLint, Prettier y selfcheck. Selfcheck utiliza su propio
Excel/Features temporales, sin depender de tus cambios de cobertura. Comprueba
seleccion, omisiones, datos invalidos, consolidacion, properties, prioridad de
variables, workers y configuracion de matriz/pipeline.

Validacion inicial: Chromium completo 13 PASSED/1 SKIPPED, tambien con 2 workers;
smoke 3 PASSED/1 SKIPPED. Fallo funcional controlado produjo PNG, Word, HTML
y trace.zip. Dashboard y contenido OOXML de Word revisados. Firefox/WebKit
no pudieron validarse funcionalmente en este entorno Windows por DLLs de
ejecucion; deben comprobarse en un equipo compatible o runner Linux.
La paginacion exacta de Word no se verifico en Microsoft Word/LibreOffice.
La revision de esta version vuelve a validar codigo, properties y Chromium;
su resultado concreto se comunica junto al ZIP. El workflow se revisa localmente,
pero requiere una corrida real en GitHub para confirmar el entorno remoto.

Executable doesn't exist: npx.cmd playwright install con la version del proyecto.
DLL/dependencias: reinstala los motores; en Linux usa --with-deps.
Sin seleccion/ID/TAP inexistente: revisa Examples, tags y filtros de properties.
Selector/timeout: revisa el paso, PNG y traza; confirma acceso a Sauce Demo.
Excel bloqueado: cierralo antes de regenerarlo.
No hay reporte: revisa permisos de reports y el cucumber.log del motor.

Referencias oficiales:
https://playwright.dev/docs/library
https://playwright.dev/docs/ci
https://github.com/cucumber/cucumber-js/blob/main/docs/support_files/hooks.md
https://github.com/cucumber/cucumber-js/blob/main/docs/parallel.md
https://github.com/exceljs/exceljs
https://prettier.io/docs/ignore
https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
