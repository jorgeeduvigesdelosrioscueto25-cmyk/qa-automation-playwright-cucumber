import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/customWorld';
When('agrega los productos seleccionados al carrito', async function (this: CustomWorld) {
  this.productosEsperados = await this.pageProductos.agregarProductos(this.datosPrueba.productos);
});
Then(
  'debe visualizar los productos seleccionados y el contador correcto',
  async function (this: CustomWorld) {
    await this.pageProductos.verificarSeleccion(this.datosPrueba.productos);
  },
);
