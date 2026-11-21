import type {
  DecisaoBairro,
  MapeamentoParcial,
  Separador,
} from "@/lib/importacao/tipos-importacao"

// Estado do assistente de importação (DEC-T-01): só o que o analista escolheu. Leitura e análise são derivadas no
// componente, com `useMemo`, sobre o motor. Nada disto vai ao servidor antes da confirmação (DV-23).

export type PassoAssistente =
  "envio" | "colunas" | "bairros" | "validacao" | "confirmar"

export const PASSOS_DO_ASSISTENTE: readonly {
  id: PassoAssistente
  rotulo: string
}[] = [
  { id: "envio", rotulo: "Enviar arquivo" },
  { id: "colunas", rotulo: "Colunas" },
  { id: "bairros", rotulo: "Bairros" },
  { id: "validacao", rotulo: "Validação" },
  { id: "confirmar", rotulo: "Confirmar" },
]

export type EntradaDoArquivo = {
  nome: string
  bytes: Uint8Array
  /** SHA-256 dos bytes para o aviso "já importado"; `null` quando o navegador não consegue calcular. */
  hash: string | null
}

export type EstadoAssistente = {
  passo: PassoAssistente
  entrada: EntradaDoArquivo | null
  /** `undefined` = o detectado no cabeçalho. */
  separador: Separador | undefined
  /** `null` = a sugestão pelo cabeçalho. */
  mapeamento: MapeamentoParcial | null
  decisoes: DecisaoBairro[]
  /** Falso na abertura da página: o foco só vai ao título do passo depois de uma ação do analista. */
  interagiu: boolean
}

export type AcaoAssistente =
  | { tipo: "arquivo-escolhido"; entrada: EntradaDoArquivo }
  | { tipo: "separador-trocado"; separador: Separador | undefined }
  | { tipo: "mapeamento-alterado"; mapeamento: MapeamentoParcial }
  | { tipo: "decisao-registrada"; decisao: DecisaoBairro }
  | { tipo: "passo-alterado"; passo: PassoAssistente }
  | { tipo: "cancelado" }

export const ESTADO_INICIAL: EstadoAssistente = {
  passo: "envio",
  entrada: null,
  separador: undefined,
  mapeamento: null,
  decisoes: [],
  interagiu: false,
}

// A decisão vale para todas as linhas do nome (RF-02.11): uma nova substitui a anterior do mesmo nome.
function registrarDecisao(
  decisoes: readonly DecisaoBairro[],
  decisao: DecisaoBairro
): DecisaoBairro[] {
  return [
    ...decisoes.filter(
      (atual) => atual.nomeNormalizado !== decisao.nomeNormalizado
    ),
    decisao,
  ]
}

export function reduzirAssistente(
  estado: EstadoAssistente,
  acao: AcaoAssistente
): EstadoAssistente {
  switch (acao.tipo) {
    case "arquivo-escolhido":
      // Arquivo novo recomeça tudo: colunas, separador e decisões eram do arquivo anterior.
      return {
        ...ESTADO_INICIAL,
        passo: "colunas",
        entrada: acao.entrada,
        interagiu: true,
      }
    case "separador-trocado":
      // Outro separador muda as colunas e os nomes: mapeamento e decisões anteriores deixam de valer.
      return {
        ...estado,
        separador: acao.separador,
        mapeamento: null,
        decisoes: [],
      }
    case "mapeamento-alterado":
      return { ...estado, mapeamento: acao.mapeamento }
    case "decisao-registrada":
      return {
        ...estado,
        decisoes: registrarDecisao(estado.decisoes, acao.decisao),
      }
    case "passo-alterado":
      return { ...estado, passo: acao.passo, interagiu: true }
    case "cancelado":
      // Cancelar descarta tudo e volta ao envio, sem nada gravado nem rascunho (RF-02.07).
      return { ...ESTADO_INICIAL, interagiu: true }
  }
}
