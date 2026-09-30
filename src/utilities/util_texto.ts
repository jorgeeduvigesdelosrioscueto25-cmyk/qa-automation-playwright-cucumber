export function textoExacto(texto: string): RegExp {
  return new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
}
