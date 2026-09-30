@web @automation @happyPath @xc-DataTest @productos
Feature: Seleccion de productos en Sauce Demo
  @regression
  Scenario Outline: Validar la seleccion de productos con los datos <datos>
    Given que el usuario accede a Sauce Demo
    When inicia sesion usando los datos "<datos>"
    And agrega los productos seleccionados al carrito
    Then debe visualizar los productos seleccionados y el contador correcto
    Examples:
      | datos |
      | 1     |
      | 2     |
