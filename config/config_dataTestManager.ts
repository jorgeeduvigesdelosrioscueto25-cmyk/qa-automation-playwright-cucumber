import path from 'node:path';
import ExcelJS from 'exceljs';
import { cargarConfiguracion } from './config_environment';
import type { DatosPrueba } from '../src/types/type_ejecucion';
export const HOJAS = [
  'home',
  'loginNegativo',
  'productos',
  'carrito',
  'compra',
  'compraNegativo',
] as const;
const COLUMNAS_COMUNES = ['ID', 'TAP', 'EJECUTAR', 'ESCENARIO', 'RESULTADO ESPERADO'];
type Registro = Record<string, string>;
export class ErrorDatos extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDatos';
  }
}
export class DataTestManager {
  private registros = new Map<string, Map<number, Registro>>();
  constructor(private archivo = path.resolve(cargarConfiguracion().dataFile)) {}
  async inicializar(): Promise<void> {
    this.registros.clear();
    const libro = new ExcelJS.Workbook();
    try {
      await libro.xlsx.readFile(this.archivo);
    } catch (error) {
      throw new ErrorDatos(`No se puede leer ${this.archivo}: ${String(error)}`);
    }
    const taps = new Set<string>();
    for (const hoja of libro.worksheets) {
      if (!HOJAS.includes(hoja.name as (typeof HOJAS)[number]))
        throw new ErrorDatos(
          `Hoja no registrada: ${hoja.name}. Agreguela a HOJAS y defina su validacion.`,
        );
      const cabeceras = new Map<string, number>();
      hoja.getRow(1).eachCell((celda, columna) => {
        const nombre = celda.text.trim();
        if (cabeceras.has(nombre)) throw new ErrorDatos(`Columna duplicada ${hoja.name}/${nombre}`);
        cabeceras.set(nombre, columna);
      });
      const funcionales = ['USUARIO', 'CONTRASENA'];
      if (['productos', 'carrito', 'compra', 'compraNegativo'].includes(hoja.name))
        funcionales.push('PRODUCTOS');
      if (['compra', 'compraNegativo'].includes(hoja.name))
        funcionales.push('NOMBRE', 'APELLIDO', 'CODIGO_POSTAL');
      if (['loginNegativo', 'compraNegativo'].includes(hoja.name))
        funcionales.push('MENSAJE_ESPERADO', 'CAMPO_VACIO');
      for (const columna of [...COLUMNAS_COMUNES, ...funcionales]) {
        if (!cabeceras.has(columna))
          throw new ErrorDatos(`Falta columna ${columna} en ${hoja.name}`);
      }
      const filas = new Map<number, Registro>();
      hoja.eachRow((fila, numero) => {
        if (numero === 1) return;
        const registro: Registro = {};
        for (const [cabecera, indice] of cabeceras) {
          const celda = fila.getCell(indice);
          if (celda.type === ExcelJS.ValueType.Formula || celda.type === ExcelJS.ValueType.Error)
            throw new ErrorDatos(
              `No se admiten formulas/errores en ${hoja.name}, fila ${numero}, ${cabecera}`,
            );
          registro[cabecera] = celda.text.trim();
        }
        if (Object.values(registro).every((valor) => !valor)) return;
        const id = Number(registro.ID);
        if (!/^\d+$/.test(registro.ID) || !Number.isSafeInteger(id) || id < 1)
          throw new ErrorDatos(`ID invalido en ${hoja.name}, fila ${numero}`);
        if (filas.has(id)) throw new ErrorDatos(`ID duplicado ${hoja.name}/${id}`);
        if (!/^TAP-\d{3}$/.test(registro.TAP) || registro.TAP === 'TAP-000')
          throw new ErrorDatos(`TAP invalido: ${registro.TAP}`);
        if (taps.has(registro.TAP))
          throw new ErrorDatos(`TAP duplicado en el libro: ${registro.TAP}`);
        if (!['SI', 'NO'].includes(registro.EJECUTAR.toUpperCase()))
          throw new ErrorDatos(`EJECUTAR debe ser SI o NO: ${hoja.name}/${id}`);
        if (!/^Validar\b/.test(registro.ESCENARIO) || !registro['RESULTADO ESPERADO'])
          throw new ErrorDatos(`ESCENARIO/RESULTADO ESPERADO invalidos: ${hoja.name}/${id}`);
        taps.add(registro.TAP);
        filas.set(id, registro);
      });
      this.registros.set(hoja.name, filas);
    }
    const numeros = [...taps].map((tap) => Number(tap.slice(4))).sort((a, b) => a - b);
    if (!numeros.length || numeros.some((numero, indice) => numero !== indice + 1))
      throw new ErrorDatos(
        'Los TAP del libro deben ser correlativos desde TAP-001, sin huecos ni duplicados',
      );
  }
  resolver(tags: string[], id: number): DatosPrueba {
    const libros = tags.filter((tag) => tag.startsWith('@xc-'));
    if (libros.length !== 1 || libros[0] !== '@xc-DataTest')
      throw new ErrorDatos('El caso debe tener exactamente la etiqueta @xc-DataTest');
    const hojas = tags.filter((tag) => HOJAS.some((hoja) => tag === `@${hoja}`));
    if (hojas.length !== 1)
      throw new ErrorDatos('El caso debe tener exactamente una etiqueta de hoja registrada');
    const hoja = hojas[0].slice(1);
    if (!this.registros.has(hoja)) throw new ErrorDatos(`Hoja inexistente: ${hoja}`);
    const registro = this.registros.get(hoja)!.get(id);
    if (!registro) throw new ErrorDatos(`ID ${id} inexistente en hoja ${hoja}`);
    const necesarios = ['USUARIO', 'CONTRASENA'];
    if (['productos', 'carrito', 'compra', 'compraNegativo'].includes(hoja))
      necesarios.push('PRODUCTOS');
    if (['compra', 'compraNegativo'].includes(hoja))
      necesarios.push('NOMBRE', 'APELLIDO', 'CODIGO_POSTAL');
    const campoVacio = registro.CAMPO_VACIO || '';
    const vaciosPermitidos =
      hoja === 'loginNegativo'
        ? ['USUARIO', 'CONTRASENA']
        : hoja === 'compraNegativo'
          ? ['NOMBRE', 'APELLIDO', 'CODIGO_POSTAL']
          : [];
    if (campoVacio && !vaciosPermitidos.includes(campoVacio))
      throw new ErrorDatos(`CAMPO_VACIO no permitido: ${hoja}/${id}/${campoVacio}`);
    if (hoja === 'compraNegativo' && !campoVacio)
      throw new ErrorDatos(`Defina CAMPO_VACIO para ${hoja}/${id}`);
    for (const columna of necesarios) {
      if (columna === campoVacio && registro[columna])
        throw new ErrorDatos(`${columna} debe estar vacio para ${registro.TAP}`);
      if (columna !== campoVacio && !registro[columna])
        throw new ErrorDatos(`Dato obligatorio vacio ${columna}: ${hoja}/${id}`);
    }
    if (['loginNegativo', 'compraNegativo'].includes(hoja) && !registro.MENSAJE_ESPERADO)
      throw new ErrorDatos(`Falta MENSAJE_ESPERADO: ${hoja}/${id}`);
    const productos = registro.PRODUCTOS
      ? registro.PRODUCTOS.split('|').map((nombre) => nombre.trim())
      : [];
    if (productos.some((nombre) => !nombre) || new Set(productos).size !== productos.length)
      throw new ErrorDatos(`Lista PRODUCTOS vacia o duplicada: ${hoja}/${id}`);
    return {
      id,
      tap: registro.TAP,
      ejecutar: registro.EJECUTAR.toUpperCase() === 'SI',
      escenario: registro.ESCENARIO,
      resultadoEsperado: registro['RESULTADO ESPERADO'],
      hoja,
      libro: 'xc-DataTest',
      usuario: registro.USUARIO,
      contrasena: registro.CONTRASENA,
      productos,
      nombre: registro.NOMBRE || '',
      apellido: registro.APELLIDO || '',
      codigoPostal: registro.CODIGO_POSTAL || '',
      mensajeEsperado: registro.MENSAJE_ESPERADO || '',
      campoVacio,
    };
  }
}
