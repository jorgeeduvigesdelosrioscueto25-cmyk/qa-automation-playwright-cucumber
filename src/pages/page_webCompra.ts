import type { Page } from 'playwright';
import type { Comprador } from '../types/type_comprador';
import type { ProductoEsperado } from '../types/type_producto';
import { localizadoresCompra } from '../locators/locator_webCompra';
import { WebCarritoPage } from './page_webCarrito';
import { expect, importe } from '../utilities/util_aserciones';
export class WebCompraPage {
  private loc;
  constructor(private page: Page) {
    this.loc = localizadoresCompra(page);
  }
  async completarComprador(datos: Comprador) {
    await this.loc.txtNombre.fill(datos.nombre);
    await this.loc.txtApellido.fill(datos.apellido);
    await this.loc.txtCodigoPostal.fill(datos.codigoPostal);
    await this.loc.btnContinuar.click();
  }
  async verificarResumen(productos: ProductoEsperado[]) {
    await expect(this.page).toHaveURL(/\/checkout-step-two\.html$/);
    await new WebCarritoPage(this.page).verificarProductos(productos);
    const subtotal =
      Math.round(productos.reduce((total, producto) => total + producto.precio, 0) * 100) / 100;
    const impuesto = Math.round(subtotal * 0.08 * 100) / 100;
    expect(importe(await this.loc.lblSubtotal.innerText())).toBe(subtotal);
    expect(importe(await this.loc.lblImpuesto.innerText())).toBe(impuesto);
    expect(importe(await this.loc.lblTotal.innerText())).toBe(
      Math.round((subtotal + impuesto) * 100) / 100,
    );
  }
  async confirmarCompra(productos: ProductoEsperado[]) {
    await this.verificarResumen(productos);
    await this.loc.btnFinalizar.click();
    await expect(this.page).toHaveURL(/\/checkout-complete\.html$/);
  }
  async verificarError(mensaje: string) {
    await expect(this.loc.lblMensajeError).toHaveText(mensaje);
    await expect(this.page).toHaveURL(/\/checkout-step-one\.html$/);
  }
}
