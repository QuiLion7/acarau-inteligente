// Ponte entre a obra e o formulário (TechSpec EP-04 §4 `ObraFormulario`, §5 "Cliente"). Puro: valores iniciais e a
// tradução dos campos do servidor (nomes do request) para os campos do formulário.
import { ApiError } from "@/lib/api/api-error"
import {
  formatarCoordenada,
  formatarValorParaCampo,
} from "@/lib/obras/valores-obra"
import type { Obra, ObraFormulario } from "@/lib/validations/obra-schema"

export type CampoDoFormulario = keyof ObraFormulario
/** `localizacao` é do grupo (latitude e longitude juntas), não de um campo só. */
export type CampoComErro = CampoDoFormulario | "localizacao"

/** Formulário de nova obra: tudo vazio, situação "planejada" (a mais comum no cadastro). */
const FORMULARIO_VAZIO: ObraFormulario = {
  titulo: "",
  situacao: "planejada",
  descricao: "",
  categoria: "",
  secretaria: "",
  dataInicio: "",
  dataPrevista: "",
  valorPrevisto: "",
  latitude: "",
  longitude: "",
}

export function valoresIniciaisDoFormulario(obra: Obra | null): ObraFormulario {
  if (obra === null) return FORMULARIO_VAZIO
  return {
    titulo: obra.titulo,
    situacao: obra.situacao,
    descricao: obra.descricao ?? "",
    categoria: obra.categoria ?? "",
    secretaria: obra.secretaria ?? "",
    dataInicio: obra.dataInicio ?? "",
    dataPrevista: obra.dataPrevista ?? "",
    valorPrevisto:
      obra.valorPrevistoCentavos === null
        ? ""
        : formatarValorParaCampo(obra.valorPrevistoCentavos),
    latitude: obra.localizacao
      ? formatarCoordenada(obra.localizacao.latitude)
      : "",
    longitude: obra.localizacao
      ? formatarCoordenada(obra.localizacao.longitude)
      : "",
  }
}

// Campo do request (`ObraEntrada`) → campo do formulário onde o erro aparece.
const CAMPO_DO_FORMULARIO: Record<string, CampoComErro> = {
  titulo: "titulo",
  situacao: "situacao",
  descricao: "descricao",
  categoria: "categoria",
  secretaria: "secretaria",
  dataInicio: "dataInicio",
  dataPrevista: "dataPrevista",
  valorPrevistoCentavos: "valorPrevisto",
  localizacao: "localizacao",
}

/**
 * Mensagens do `VALIDACAO` do servidor (`details.campos`) por campo do formulário. Campo desconhecido é ignorado;
 * qualquer outro erro, ou `VALIDACAO` sem campos, não gera mensagem por campo (vira aviso do formulário).
 */
export function errosDoServidorPorCampo(
  erro: unknown
): Partial<Record<CampoComErro, string>> {
  if (!(erro instanceof ApiError) || erro.code !== "VALIDACAO") return {}
  const campos = erro.details?.campos
  if (typeof campos !== "object" || campos === null) return {}
  const mensagens: Partial<Record<CampoComErro, string>> = {}
  for (const [campoDoRequest, mensagem] of Object.entries(campos)) {
    const campo = CAMPO_DO_FORMULARIO[campoDoRequest]
    if (campo && typeof mensagem === "string") mensagens[campo] = mensagem
  }
  return mensagens
}
