// Mensagens-chave do módulo Território (PRD §7, TechSpec EP-01 §4.6). Os números entram por interpolação,
// vindos do artefato; nenhum texto daqui fixa contagem.
export const TEXTOS_TERRITORIO = {
  avisoReconstrucao:
    "Reconstrução técnica da Lei Municipal 2.172/2026 - não é arquivo oficial homologado da Prefeitura.",
  coberturaDemonstracao:
    "A demonstração cobre os 24 bairros (Unidades de Vizinhança) da sede de Acaraú. Localidades da zona rural não estão nessa cobertura.",
  bairroSemEscola:
    "Nenhuma escola da base disponível dentro deste bairro. A base não é um censo completo.",
  buscaEscolaRotulo: "Buscar escola",
  buscaEscolaDica: "Nome ou código INEP",
  limparFiltros: "Limpar filtros",
  escolasSemResultadoTitulo: "Nenhuma escola encontrada",
  escolasSemResultado:
    "Nenhuma escola da base corresponde à busca e aos filtros escolhidos.",
  escolaForaDoLimite:
    "Coordenada fora do limite municipal - possível inconsistência na fonte.",
  escolaSemLocalizacao:
    "Escola sem coordenada na base: não aparece no mapa e fica fora da contagem de marcadores.",
  fundoIndisponivel:
    "Fundo de mapa indisponível; as camadas da demonstração continuam visíveis.",
  dataNaoInformada: "Não informada",
} as const

export function textoEscolasGeorreferenciadas(total: number): string {
  const estabelecimentos =
    total === 1 ? "estabelecimento escolar" : "estabelecimentos escolares"
  const georreferenciados =
    total === 1 ? "georreferenciado" : "georreferenciados"
  return `${total} ${estabelecimentos} ${georreferenciados} na base disponível.`
}
