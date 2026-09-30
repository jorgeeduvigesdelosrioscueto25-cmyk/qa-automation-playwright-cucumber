import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/customWorld';
When('completa los datos del comprador', async function (this: CustomWorld) {
  await this.pageCarrito.iniciarCompra();
  await this.pageCompra.completarComprador(this.datosPrueba);
});
When('intenta continuar con los datos del comprador', async function (this: CustomWorld) {
  await this.pageCarrito.iniciarCompra();
  await this.pageCompra.completarComprador(this.datosPrueba);
});
When('confirma la compra', async function (this: CustomWorld) {
  await this.pageCompra.confirmarCompra(this.productosEsperados);
});
Then('debe visualizar la confirmacion exitosa', async function (this: CustomWorld) {
  await this.pageConfirmacion.verificarConfirmacion(this.datosPrueba.resultadoEsperado);
});
Then(
  'debe visualizar el mensaje de validacion del comprador esperado',
  async function (this: CustomWorld) {
    await this.pageCompra.verificarError(this.datosPrueba.mensajeEsperado);
  },
);
