@web @login @happyPath @xc-DataTest @home
Feature: Inicio de sesion valido en Sauce Demo
  @smoke @regression
  Scenario Outline: Validar el acceso al catalogo con los datos <datos>
    Given que el usuario accede a Sauce Demo
    When inicia sesion usando los datos "<datos>"
    Then debe visualizar el catalogo de productos
    Examples:
      | datos |
      | 1     |
      | 2     |
