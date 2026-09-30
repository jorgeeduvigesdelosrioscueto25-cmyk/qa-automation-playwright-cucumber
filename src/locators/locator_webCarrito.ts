import type { Page } from 'playwright';
import { textoExacto } from '../utilities/util_aserciones';
export function localizadoresCarrito(page: Page) {
  return {
    lblNombres: page.getByTestId('inventory-item-name'),
    btnCheckout: page.getByRole('button', { name: 'Checkout', exact: true }),
    fila: (nombre: string) =>
      page.locator('.cart_item').filter({
        has: page.getByTestId('inventory-item-name').filter({ hasText: textoExacto(nombre) }),
      }),
    lblCantidad: (nombre: string) =>
      localizadoresCarrito(page).fila(nombre).getByTestId('item-quantity'),
    lblPrecio: (nombre: string) =>
      localizadoresCarrito(page).fila(nombre).getByTestId('inventory-item-price'),
  };
}
