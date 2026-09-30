@web @automation @happyPath @xc-DataTest @compra
Feature: Compra completa en Sauce Demo
  @smoke @regression
  Scenario Outline: Validar el proceso de compra exitosa con los datos <datos>
    Given que el usuario accede a Sauce Demo
    When inicia sesion usando los datos "<datos>"
    And agrega los productos seleccionados al carrito
    And abre el carrito
    And verifica los productos agregados
    And completa los datos del comprador
    And confirma la compra
    Then debe visualizar la confirmacion exitosa
    Examples:
      | datos |
      | 1     |
      | 2     |
