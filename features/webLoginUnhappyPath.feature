@web @automation @unhappyPath @xc-DataTest @loginNegativo
Feature: Rechazo del inicio de sesion en Sauce Demo
  @regression
  Scenario Outline: Validar el rechazo del inicio de sesion con los datos <datos>
    Given que el usuario accede a Sauce Demo
    When intenta iniciar sesion usando los datos "<datos>"
    Then debe visualizar el mensaje de error de acceso esperado
    Examples:
      | datos |
      | 1     |
      | 2     |
      | 3     |
      | 4     |
