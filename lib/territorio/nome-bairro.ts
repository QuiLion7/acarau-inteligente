// Grafia de exibição do bairro (RN-01.05) e normalização de texto para busca (RN-009).
const CONECTIVOS = new Set(["de", "da", "do", "das", "dos", "e"])
const NUMERAL_ROMANO = /^(?=[IVX]+$)X{0,3}(IX|IV|V?I{0,3})$/

function primeiraMaiuscula(palavra: string): string {
  return palavra.charAt(0).toLocaleUpperCase("pt-BR") + palavra.slice(1)
}

/** "MONSENHOR EDSON MAGALHÃES" → "Monsenhor Edson Magalhães"; conectivos em minúscula e numeral romano preservado. */
export function formatarNomeBairro(nomeLei: string): string {
  return nomeLei
    .trim()
    .split(/\s+/)
    .map((palavra, indice) => {
      if (NUMERAL_ROMANO.test(palavra.toUpperCase()))
        return palavra.toUpperCase()
      const minuscula = palavra.toLocaleLowerCase("pt-BR")
      if (indice > 0 && CONECTIVOS.has(minuscula)) return minuscula
      return primeiraMaiuscula(minuscula)
    })
    .join(" ")
}

/** Sem acento, caixa baixa e espaços únicos: "  SÃO   Benedito " → "sao benedito". */
export function normalizarParaBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim()
}
