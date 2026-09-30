import type { Page } from 'playwright';
import type { ProductoEsperado } from '../types/type_producto';
import { localizadoresProductos } from '../locators/locator_webProductos';
import { expect, importe } from '../utilities/util_aserciones';
export class WebProductosPage {
  private loc;
  constructor(private page: Page) {
    this.loc = localizadoresProductos(page);
  }
  async verificarCatalogo() {
    await expect(this.page).toHaveURL(/\/inventory\.html$/);
    await expect(this.loc.lblTitulo).toHaveText('Products');
  }
  async agregarProductos(nombres: string[]): Promise<ProductoEsperado[]> {
    await this.verificarCatalogo();
    const productos: ProductoEsperado[] = [];
    for (const nombre of nombres) {
      await expect(
        this.loc.tarjeta(nombre),
        `Producto no encontrado o duplicado: ${nombre}`,
      ).toHaveCount(1);
      productos.push({ nombre, precio: importe(await this.loc.lblPrecio(nombre).innerText()) });
      await this.loc.btnAgregar(nombre).click();
    }
    return productos;
  }
  async verificarSeleccion(nombres: string[]) {
    for (const nombre of nombres) await expect(this.loc.btnQuitar(nombre)).toBeVisible();
    await expect(this.loc.lblContadorCarrito).toHaveText(String(nombres.length));
  }
  async abrirCarrito() {
    await this.loc.lnkCarrito.click();
    await expect(this.page).toHaveURL(/\/cart\.html$/);
  }
}
