// Camadas de dados já carregadas (RN-005, DV-10, DV-21): "Fontes e limitações" lista só o que consta aqui.
// O que foi carregado vem de `dados/gerados/camadas.json` (a carga só grava o que validou); os textos
// descritivos são fixos por `id`. O mapa base é contexto visual, não carga, e por isso é entrada fixa.
import camadasGeradas from "@/dados/gerados/camadas.json"
import {
  artefatoCamadasSchema,
  type ArtefatoCamadas,
} from "@/lib/territorio/artefato-schema"

import { TEXTOS_TERRITORIO } from "./textos-territorio"

export type CamadaCarregada = {
  id: string
  nome: string
  fonte: string
  etiqueta: string
  versao: string
  dataReferencia: string
  cobertura: string
  limitacoes: string[]
}

type IdCamadaDeCarga = ArtefatoCamadas["camadas"][number]["id"]
type DescricaoFixa = Omit<CamadaCarregada, "id" | "versao" | "dataReferencia">

const DESCRICOES: Record<IdCamadaDeCarga, DescricaoFixa> = {
  bairros: {
    nome: "Bairros (Unidades de Vizinhança)",
    fonte: "Lei Municipal 2.172/2026, art. 8º, I",
    etiqueta: "DERIVADO_VALIDAR",
    cobertura:
      "As 24 Unidades de Vizinhança da sede de Acaraú; localidades da zona rural não estão nessa cobertura.",
    limitacoes: [
      TEXTOS_TERRITORIO.avisoReconstrucao,
      "A área declarada na lei não consta para alguns bairros; nesses casos a ficha diz que ela não foi informada na lei.",
    ],
  },
  escolas: {
    nome: "Escolas",
    fonte: "Catálogo de escolas do INEP (CSV fornecido)",
    etiqueta: "OFICIAL_FONTE (NAO_GEOREFERENCIADO para as sem coordenada)",
    cobertura: "Escolas do município de Acaraú presentes na base disponível.",
    limitacoes: [
      "A base disponível não é um censo completo das escolas.",
      "Escola sem coordenada não aparece no mapa e fica listada no quadro de qualidade da base.",
      "Coordenada fora do limite municipal é mantida e sinalizada, sem correção.",
    ],
  },
  "limite-municipal": {
    nome: "Limite municipal",
    fonte: "IPECE",
    etiqueta: "OFICIAL_FONTE",
    cobertura: "Município de Acaraú (código IBGE 2300200).",
    limitacoes: [
      "Serve de contorno de referência e para identificar escola fora do município; não é fonte de área oficial.",
    ],
  },
}

const MAPA_BASE_FIXO: CamadaCarregada = {
  id: "mapa-base",
  nome: "Mapa base",
  fonte: "OpenStreetMap, licença ODbL",
  etiqueta: "COLABORATIVO",
  versao: "Serviço externo, sem versão fixa",
  dataReferencia: "Atualizado continuamente pelo provedor",
  cobertura: "Qualquer lugar do mapa; é só contexto visual.",
  limitacoes: [
    "Fundo carregado de um serviço externo: pode ficar indisponível, e as camadas da demonstração continuam visíveis.",
    "Não entra em nenhum cálculo da demonstração.",
  ],
}

/**
 * Junta o que a carga validou aos textos fixos e acrescenta o mapa base. Sem camada de carga a lista é vazia
 * (o mapa base sozinho não é dado carregado, RN-005) e a página mostra o estado "nenhuma camada".
 */
export function montarCamadasCarregadas(
  artefato: ArtefatoCamadas
): CamadaCarregada[] {
  const deCarga = artefato.camadas.map(({ id, versao, dataReferencia }) => ({
    ...DESCRICOES[id],
    id,
    versao,
    dataReferencia: dataReferencia ?? TEXTOS_TERRITORIO.dataNaoInformada,
  }))
  return deCarga.length === 0 ? [] : [...deCarga, MAPA_BASE_FIXO]
}

export const CAMADAS_CARREGADAS: readonly CamadaCarregada[] =
  montarCamadasCarregadas(artefatoCamadasSchema.parse(camadasGeradas))
