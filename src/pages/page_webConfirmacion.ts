import type { Page } from 'playwright';
import { localizadoresConfirmacion } from '../locators/locator_webConfirmacion';
import { expect } from '../utilities/util_aserciones';
export class WebConfirmacionPage {
  private loc;
  constructor(private page: Page) {
    this.loc = localizadoresConfirmacion(page);
  }
  async verificarConfirmacion(mensaje: string) {
    await expect(this.page).toHaveURL(/\/checkout-complete\.html$/);
    await expect(this.loc.lblConfirmacion).toHaveText(mensaje);
    await expect(this.loc.lblDescripcion).toBeVisible();
    await expect(this.loc.btnVolver).toBeVisible();
  }
}
