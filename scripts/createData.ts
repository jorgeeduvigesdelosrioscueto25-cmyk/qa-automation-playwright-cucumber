import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';
const COLUMNAS = [
  'ID',
  'TAP',
  'EJECUTAR',
  'ESCENARIO',
  'RESULTADO ESPERADO',
  'USUARIO',
  'CONTRASENA',
  'PRODUCTOS',
  'NOMBRE',
  'APELLIDO',
  'CODIGO_POSTAL',
  'MENSAJE_ESPERADO',
  'CAMPO_VACIO',
];
type Fila = Record<string, string | number>;
const credenciales = { USUARIO: 'standard_user', CONTRASENA: 'secret_sauce' };
const comprador = { NOMBRE: 'Juan', APELLIDO: 'Perez', CODIGO_POSTAL: '15001' };
const producto = 'Sauce Labs Backpack';
const varios = `${producto} | Sauce Labs Bike Light`;
function fila(
  ID: number,
  numero: number,
  ESCENARIO: string,
  resultado: string,
  extras: Fila = {},
): Fila {
  return {
    ID,
    TAP: `TAP-${String(numero).padStart(3, '0')}`,
    EJECUTAR: 'SI',
    ESCENARIO,
    'RESULTADO ESPERADO': resultado,
    ...credenciales,
    ...extras,
  };
}
export async function crearDatos(archivo = path.resolve('resources/data/xc-DataTest.xlsx')) {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'QA Automation';
  const hojas: Record<string, Fila[]> = {
    home: [
      fila(
        1,
        1,
        'Validar el inicio de sesion con credenciales validas',
        'Se muestra Products y la URL inventory.html',
      ),
      fila(
        2,
        14,
        'Validar el inicio de sesion con el registro deshabilitado',
        'Se muestra Products y la URL inventory.html',
        { EJECUTAR: 'NO' },
      ),
      fila(
        3,
        15,
        'Validar el inicio de sesion con un registro fuera de Examples',
        'Se muestra Products y la URL inventory.html',
      ),
    ],
    loginNegativo: [
      fila(
        1,
        2,
        'Validar el rechazo de credenciales incorrectas',
        'Se rechaza el acceso y se muestra el error de credenciales',
        {
          USUARIO: 'usuario_invalido',
          CONTRASENA: 'incorrecta',
          MENSAJE_ESPERADO:
            'Epic sadface: Username and password do not match any user in this service',
        },
      ),
      fila(
        2,
        3,
        'Validar el acceso restringido de locked_out_user',
        'Se rechaza el acceso del usuario bloqueado',
        {
          USUARIO: 'locked_out_user',
          MENSAJE_ESPERADO: 'Epic sadface: Sorry, this user has been locked out.',
        },
      ),
      fila(
        3,
        12,
        'Validar que el usuario de inicio de sesion es obligatorio',
        'Se solicita el usuario y no se permite ingresar',
        {
          USUARIO: '',
          CAMPO_VACIO: 'USUARIO',
          MENSAJE_ESPERADO: 'Epic sadface: Username is required',
        },
      ),
      fila(
        4,
        13,
        'Validar que la contrasena de inicio de sesion es obligatoria',
        'Se solicita la contrasena y no se permite ingresar',
        {
          CONTRASENA: '',
          CAMPO_VACIO: 'CONTRASENA',
          MENSAJE_ESPERADO: 'Epic sadface: Password is required',
        },
      ),
    ],
    productos: [
      fila(
        1,
        4,
        'Validar la incorporacion de un producto al carrito',
        'Los productos seleccionados cambian a Remove y el contador coincide',
        { PRODUCTOS: producto },
      ),
      fila(
        2,
        5,
        'Validar la incorporacion de varios productos al carrito',
        'Los productos seleccionados cambian a Remove y el contador coincide',
        { PRODUCTOS: varios },
      ),
    ],
    carrito: [
      fila(
        1,
        6,
        'Validar la visualizacion de los productos agregados al carrito',
        'El carrito contiene exactamente los nombres, cantidades y precios seleccionados',
        { PRODUCTOS: varios },
      ),
    ],
    compra: [
      fila(1, 7, 'Validar una compra exitosa con un producto', 'Thank you for your order!', {
        ...comprador,
        PRODUCTOS: producto,
      }),
      fila(2, 8, 'Validar una compra exitosa con varios productos', 'Thank you for your order!', {
        ...comprador,
        PRODUCTOS: varios,
      }),
    ],
    compraNegativo: [
      fila(
        1,
        9,
        'Validar que el nombre del comprador es obligatorio',
        'El checkout permanece en informacion y solicita el nombre',
        {
          ...comprador,
          PRODUCTOS: producto,
          NOMBRE: '',
          CAMPO_VACIO: 'NOMBRE',
          MENSAJE_ESPERADO: 'Error: First Name is required',
        },
      ),
      fila(
        2,
        10,
        'Validar que el apellido del comprador es obligatorio',
        'El checkout permanece en informacion y solicita el apellido',
        {
          ...comprador,
          PRODUCTOS: producto,
          APELLIDO: '',
          CAMPO_VACIO: 'APELLIDO',
          MENSAJE_ESPERADO: 'Error: Last Name is required',
        },
      ),
      fila(
        3,
        11,
        'Validar que el codigo postal es obligatorio',
        'El checkout permanece en informacion y solicita el codigo postal',
        {
          ...comprador,
          PRODUCTOS: producto,
          CODIGO_POSTAL: '',
          CAMPO_VACIO: 'CODIGO_POSTAL',
          MENSAJE_ESPERADO: 'Error: Postal Code is required',
        },
      ),
    ],
  };
  for (const [nombre, filas] of Object.entries(hojas)) {
    const hoja = libro.addWorksheet(nombre, {
      views: [{ state: 'frozen', ySplit: 1, xSplit: 2, showGridLines: false }],
    });
    hoja.columns = COLUMNAS.map((cabecera) => ({
      header: cabecera,
      key: cabecera,
      width: ['ESCENARIO', 'RESULTADO ESPERADO', 'MENSAJE_ESPERADO'].includes(cabecera)
        ? 52
        : cabecera === 'PRODUCTOS'
          ? 45
          : cabecera === 'ID'
            ? 7
            : 20,
    }));
    filas.forEach((registro) =>
      hoja.addRow(
        Object.fromEntries(
          Object.entries(registro).map(([clave, valor]) => [clave, valor === '' ? null : valor]),
        ),
      ),
    );
    hoja.autoFilter = { from: 'A1', to: 'M1' };
    hoja.getRow(1).height = 32;
    hoja.getRow(1).eachCell((celda) => {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17324D' } };
      celda.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      celda.alignment = { vertical: 'middle', wrapText: true };
    });
    hoja.eachRow((registro, indice) => {
      if (indice === 1) return;
      registro.height = 76;
      registro.eachCell({ includeEmpty: true }, (celda) => {
        celda.font = { name: 'Calibri', size: 11 };
        celda.alignment = { vertical: 'middle', wrapText: true };
        if (indice % 2 === 0)
          celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF5FA' } };
      });
      registro.getCell('ID').numFmt = '0';
      registro.getCell('CODIGO_POSTAL').numFmt = '@';
      registro.getCell('EJECUTAR').dataValidation = {
        type: 'list',
        allowBlank: false,
        formulae: ['"SI,NO"'],
        showErrorMessage: true,
        error: 'Use SI o NO',
      };
    });
  }
  await fs.mkdir(path.dirname(archivo), { recursive: true });
  await libro.xlsx.writeFile(archivo);
  console.log(`Excel creado: ${archivo}`);
}
if (require.main === module)
  crearDatos().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
