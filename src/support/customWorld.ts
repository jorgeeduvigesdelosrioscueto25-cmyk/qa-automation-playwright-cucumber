import { World, setWorldConstructor, type IWorldOptions } from '@cucumber/cucumber';
import type { Page, BrowserContext } from 'playwright';
import type { DatosPrueba, CasoSeleccionado, ResultadoCaso } from '../types/type_ejecucion';
import type { ProductoEsperado } from '../types/type_producto';
import { WebLoginPage } from '../pages/page_webLogin';
import { WebProductosPage } from '../pages/page_webProductos';
import { WebCarritoPage } from '../pages/page_webCarrito';
import { WebCompraPage } from '../pages/page_webCompra';
import { WebConfirmacionPage } from '../pages/page_webConfirmacion';
export class CustomWorld extends World {
  contexto?: BrowserContext;
  page?: Page;
  datosPrueba!: DatosPrueba;
  caso!: CasoSeleccionado;
  resultado!: ResultadoCaso;
  productosEsperados: ProductoEsperado[] = [];
  carpetaCaso = '';
  inicioMs = 0;
  pageLogin!: WebLoginPage;
  pageProductos!: WebProductosPage;
  pageCarrito!: WebCarritoPage;
  pageCompra!: WebCompraPage;
  pageConfirmacion!: WebConfirmacionPage;
  constructor(opciones: IWorldOptions) {
    super(opciones);
  }
  prepararPages(page: Page) {
    this.page = page;
    this.pageLogin = new WebLoginPage(page);
    this.pageProductos = new WebProductosPage(page);
    this.pageCarrito = new WebCarritoPage(page);
    this.pageCompra = new WebCompraPage(page);
    this.pageConfirmacion = new WebConfirmacionPage(page);
  }
  verificarId(id: string) {
    if (Number(id) !== this.datosPrueba.id)
      throw new Error(`ID del paso ${id} diferente del ID seleccionado ${this.datosPrueba.id}`);
  }
}
setWorldConstructor(CustomWorld);
