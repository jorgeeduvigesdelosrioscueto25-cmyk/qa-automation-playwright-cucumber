@web @automation @unhappyPath @xc-DataTest @compraNegativo
Feature: Campos obligatorios del comprador en Sauce Demo
  @regression
  Scenario Outline: Validar los campos obligatorios del checkout con los datos <datos>
    Given que el usuario accede a Sauce Demo
    When inicia sesion usando los datos "<datos>"
    And agrega los productos seleccionados al carrito
    And abre el carrito
    And verifica los productos agregados
    And intenta continuar con los datos del comprador
    Then debe visualizar el mensaje de validacion del comprador esperado
    Examples:
      | datos |
      | 1     |
      | 2     |
      | 3     |
