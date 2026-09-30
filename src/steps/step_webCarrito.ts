import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from '../support/customWorld';
When('abre el carrito', async function (this: CustomWorld) {
  await this.pageProductos.abrirCarrito();
});
When('verifica los productos agregados', async function (this: CustomWorld) {
  await this.pageCarrito.verificarProductos(this.productosEsperados);
});
Then('debe visualizar exactamente los productos agregados', async function (this: CustomWorld) {
  await this.pageCarrito.verificarProductos(this.productosEsperados);
});
