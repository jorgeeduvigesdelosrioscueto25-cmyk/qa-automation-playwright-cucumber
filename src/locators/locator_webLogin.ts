import type { Page } from 'playwright';
export function localizadoresLogin(page: Page) {
  return {
    txtUsuario: page.getByTestId('username'),
    txtContrasena: page.getByTestId('password'),
    btnIngresar: page.getByRole('button', { name: 'Login', exact: true }),
    lblMensajeError: page.getByTestId('error'),
  };
}
