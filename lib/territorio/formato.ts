// Formatação de números do território em pt-BR (separador de milhar, vírgula decimal).
const formatadorDeArea = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
})

/** 922822.4 → "922.822,4 m²". */
export function formatarAreaM2(areaM2: number): string {
  return `${formatadorDeArea.format(areaM2)} m²`
}

/** Concorda o substantivo com o número: 1 escola, 8 escolas. */
export function flexionar(
  total: number,
  singular: string,
  plural: string
): string {
  return `${total} ${total === 1 ? singular : plural}`
}
