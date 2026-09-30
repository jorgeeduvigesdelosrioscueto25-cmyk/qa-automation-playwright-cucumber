import type { Page } from 'playwright';
export function localizadoresCompra(page: Page) {
  return {
    txtNombre: page.getByTestId('firstName'),
    txtApellido: page.getByTestId('lastName'),
    txtCodigoPostal: page.getByTestId('postalCode'),
    btnContinuar: page.getByRole('button', { name: 'Continue', exact: true }),
    btnFinalizar: page.getByRole('button', { name: 'Finish', exact: true }),
    lblMensajeError: page.getByTestId('error'),
    lblSubtotal: page.getByTestId('subtotal-label'),
    lblImpuesto: page.getByTestId('tax-label'),
    lblTotal: page.getByTestId('total-label'),
  };
}
