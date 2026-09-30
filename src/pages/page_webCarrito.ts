import type { Page } from 'playwright';
import type { ProductoEsperado } from '../types/type_producto';
import { localizadoresCarrito } from '../locators/locator_webCarrito';
import { expect, importe } from '../utilities/util_aserciones';
export class WebCarritoPage {
  private loc;
  constructor(private page: Page) {
    this.loc = localizadoresCarrito(page);
  }
  async verificarProductos(productos: ProductoEsperado[]) {
    await expect(this.loc.lblNombres).toHaveCount(productos.length);
    expect((await this.loc.lblNombres.allTextContents()).sort()).toEqual(
      productos.map((producto) => producto.nombre).sort(),
    );
    for (const producto of productos) {
      await expect(this.loc.lblCantidad(producto.nombre)).toHaveText('1');
      expect(importe(await this.loc.lblPrecio(producto.nombre).innerText())).toBe(producto.precio);
    }
  }
  async iniciarCompra() {
    await this.loc.btnCheckout.click();
    await expect(this.page).toHaveURL(/\/checkout-step-one\.html$/);
  }
}
