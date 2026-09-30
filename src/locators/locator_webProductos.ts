import type { Page } from 'playwright';
import { textoExacto } from '../utilities/util_aserciones';
export function localizadoresProductos(page: Page) {
  return {
    lblTitulo: page.getByTestId('title'),
    lblContadorCarrito: page.getByTestId('shopping-cart-badge'),
    lnkCarrito: page.getByTestId('shopping-cart-link'),
    tarjeta: (nombre: string) =>
      page.locator('.inventory_item').filter({
        has: page.getByTestId('inventory-item-name').filter({ hasText: textoExacto(nombre) }),
      }),
    btnAgregar: (nombre: string) =>
      localizadoresProductos(page)
        .tarjeta(nombre)
        .getByRole('button', { name: 'Add to cart', exact: true }),
    btnQuitar: (nombre: string) =>
      localizadoresProductos(page)
        .tarjeta(nombre)
        .getByRole('button', { name: 'Remove', exact: true }),
    lblPrecio: (nombre: string) =>
      localizadoresProductos(page).tarjeta(nombre).getByTestId('inventory-item-price'),
  };
}
