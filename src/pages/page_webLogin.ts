import type { Page } from 'playwright';
import type { Usuario } from '../types/type_usuario';
import { localizadoresLogin } from '../locators/locator_webLogin';
import { expect } from '../utilities/util_aserciones';
export class WebLoginPage {
  private loc;
  constructor(private page: Page) {
    this.loc = localizadoresLogin(page);
  }
  async acceder(url: string) {
    await this.page.goto(url);
    await expect(this.loc.btnIngresar).toBeVisible();
  }
  async iniciarSesion(datos: Usuario) {
    await this.loc.txtUsuario.fill(datos.usuario);
    await this.loc.txtContrasena.fill(datos.contrasena);
    await this.loc.btnIngresar.click();
  }
  async verificarError(mensaje: string) {
    await expect(this.loc.lblMensajeError).toHaveText(mensaje);
    await expect(this.loc.btnIngresar).toBeVisible();
    await expect(this.page).not.toHaveURL(/inventory\.html/);
  }
}
