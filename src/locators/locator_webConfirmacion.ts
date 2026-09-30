import type { Page } from 'playwright';
export function localizadoresConfirmacion(page: Page) {
  return {
    lblConfirmacion: page.getByTestId('complete-header'),
    lblDescripcion: page.getByTestId('complete-text'),
    btnVolver: page.getByRole('button', { name: 'Back Home', exact: true }),
  };
}
