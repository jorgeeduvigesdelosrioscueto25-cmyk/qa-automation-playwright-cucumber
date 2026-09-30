@web @automation @happyPath @xc-DataTest @carrito
Feature: Contenido del carrito en Sauce Demo
  @regression
  Scenario Outline: Validar el contenido del carrito con los datos <datos>
    Given que el usuario accede a Sauce Demo
    When inicia sesion usando los datos "<datos>"
    And agrega los productos seleccionados al carrito
    And abre el carrito
    Then debe visualizar exactamente los productos agregados
    Examples:
      | datos |
      | 1     |
