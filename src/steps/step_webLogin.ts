import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/customWorld';
import { cargarConfiguracion } from '../../config/config_environment';
Given('que el usuario accede a Sauce Demo', async function (this: CustomWorld) {
  await this.pageLogin.acceder(cargarConfiguracion().baseUrl);
});
When('inicia sesion usando los datos {string}', async function (this: CustomWorld, id: string) {
  this.verificarId(id);
  await this.pageLogin.iniciarSesion(this.datosPrueba);
});
When(
  'intenta iniciar sesion usando los datos {string}',
  async function (this: CustomWorld, id: string) {
    this.verificarId(id);
    await this.pageLogin.iniciarSesion(this.datosPrueba);
  },
);
Then('debe visualizar el catalogo de productos', async function (this: CustomWorld) {
  await this.pageProductos.verificarCatalogo();
});
Then('debe visualizar el mensaje de error de acceso esperado', async function (this: CustomWorld) {
  await this.pageLogin.verificarError(this.datosPrueba.mensajeEsperado);
});
