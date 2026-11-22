// Mensagens-chave da Educação (PRD EP-03 §4.4, RN-03.07, RN-03.08). Sem travessão (react-next.md §13). Os números
// entram por interpolação, vindos do artefato do Território (DV-37): nenhum texto daqui fixa contagem.
import { flexionar } from "@/lib/territorio/formato"

function escolaForaDoLimiteAParte(total: number): string {
  if (total === 0) return "Nenhuma escola fora do limite municipal."
  if (total === 1) return "A escola fora do limite municipal é citada à parte."
  return `As ${total} escolas fora do limite municipal são citadas à parte.`
}

export const TEXTOS_EDUCACAO = {
  fonteEData: (fonte: string, dataReferencia: string) =>
    `Fonte: ${fonte}. Data de referência: ${dataReferencia}.`,
  cards: {
    resumo: "Resumo das escolas da base",
    registros: {
      titulo: "Registros na base",
      detalhe: "Escolas do catálogo, com e sem coordenada.",
    },
    georreferenciadas: {
      // RN-03.08: o número sempre vem com este rótulo; nenhum texto afirma completude.
      titulo: "Estabelecimentos escolares georreferenciados na base disponível",
      detalhe: "Têm posição no mapa.",
    },
    semLocalizacao: {
      titulo: "Sem localização",
      detalhe: "Pendência da base: não aparecem no mapa.",
    },
    dentroDosBairros: {
      titulo: "Dentro dos bairros da sede",
      detalhe: "Contadas em um bairro só.",
    },
    foraDaCobertura: {
      titulo: "Fora da cobertura dos bairros",
      detalhe: escolaForaDoLimiteAParte,
    },
    bairro: {
      titulo: (nomeDoBairro: string) => `Escolas em ${nomeDoBairro}`,
      // RN-03.07: zero é zero real da base inteira, não "o bairro não tem escola".
      valor: (total: number) =>
        total === 0
          ? "0 na base disponível"
          : flexionar(total, "escola", "escolas"),
      detalhe: "Dentro do bairro, na base disponível.",
    },
  },
  tabela: {
    titulo: "Escolas por bairro",
    legenda:
      "Número de escolas dentro de cada bairro da sede, na base disponível, e as escolas que ficam fora de qualquer bairro",
    escolas: "Escolas",
    semEscola: "0 na base disponível",
    foraDaSoma: "Fora da soma dos bairros",
    notaForaDaSoma:
      "Estas linhas não entram na soma de nenhum bairro: cada escola conta uma vez só.",
  },
  secoes: {
    mapa: "Escolas no mapa",
    lista: "Lista de escolas",
  },
  pendencias: {
    titulo: "Pendências de qualidade da base",
    semLocalizacao: "Sem localização (não aparecem no mapa)",
    foraDoLimite: "Fora do limite municipal",
    // RF-03.20, RN-03.09: a pendência é dita, nunca resolvida com coordenada inventada.
    naoInventa:
      "Escola sem coordenada fica sem posição: a demonstração não inventa coordenada nem geocodifica endereço. Ela aparece só na lista, na ficha e neste quadro, com a etiqueta NAO_GEOREFERENCIADO.",
  },
  metodologia: {
    titulo: "Como os números são calculados",
    base: {
      fonte: "Fonte",
      dataReferencia: "Data de referência",
    },
    contagem:
      "Cada escola com coordenada é contada pelo ponto: o bairro é o polígono que contém esse ponto.",
    foraDaCobertura:
      "Fora da cobertura dos bairros é a escola com coordenada que não cai em nenhum dos 24 bairros da sede, como as de localidades rurais.",
    foraDoLimite:
      "Fora do limite municipal é a escola com coordenada fora do município: a coordenada é mantida e sinalizada, sem correção.",
    semLocalizacao:
      "Sem localização é a escola sem coordenada na base: não aparece no mapa e não conta em nenhum bairro.",
    zero: "Zero escolas num bairro quer dizer nenhuma escola da base disponível dentro dele; não afirma que o bairro não tem escola.",
    limites:
      "A base disponível não é um censo completo e não garante que cada escola funcione hoje.",
  },
  ficha: {
    titulo: "Ficha da escola",
    descricao: "Dados da escola na base disponível.",
  },
} as const
