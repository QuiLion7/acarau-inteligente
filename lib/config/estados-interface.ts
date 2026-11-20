import {
  CalendarX,
  Construction,
  FileQuestionMark,
  FlaskConical,
  Inbox,
  Lock,
  MapPinOff,
  SearchX,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"

// Catálogo dos estados de interface (RF-00.15, DV-11). Os textos não trazem número: ausência nunca vira `0` (RN-014).
export type TipoEstado =
  | "carregando"
  | "vazio"
  | "erro"
  | "sem-permissao"
  | "dados-sinteticos"
  | "fonte-ausente"
  | "periodo-sem-dados"
  | "fora-da-cobertura"
  | "bairro-nao-reconhecido"
  | "em-breve"

export type DefinicaoEstado = {
  titulo: string
  descricao: string
  // `null` no carregamento, que mostra o Spinner no lugar do ícone.
  icone: LucideIcon | null
}

export const ESTADOS_INTERFACE: Record<TipoEstado, DefinicaoEstado> = {
  carregando: {
    titulo: "Carregando",
    descricao: "Aguarde enquanto a informação é carregada.",
    icone: null,
  },
  vazio: {
    titulo: "Nada para mostrar",
    descricao: "Ainda não há informação para exibir aqui.",
    icone: Inbox,
  },
  erro: {
    titulo: "Não foi possível carregar",
    descricao:
      "Ocorreu um problema ao carregar esta informação. Tente novamente em instantes.",
    icone: TriangleAlert,
  },
  "sem-permissao": {
    titulo: "Sem permissão",
    descricao: "Você não tem permissão para acessar esta área.",
    icone: Lock,
  },
  "dados-sinteticos": {
    titulo: "Dados sintéticos",
    descricao:
      "Estas informações são fictícias e servem apenas para a demonstração.",
    icone: FlaskConical,
  },
  "fonte-ausente": {
    titulo: "Fonte ausente",
    descricao:
      "Esta informação não tem fonte registrada e, por isso, não é exibida.",
    icone: FileQuestionMark,
  },
  "periodo-sem-dados": {
    titulo: "Período sem dados",
    descricao: "Não há dados para o período escolhido.",
    icone: CalendarX,
  },
  "fora-da-cobertura": {
    titulo: "Fora da cobertura",
    descricao:
      "O recorte escolhido está fora da área coberta pela demonstração.",
    icone: MapPinOff,
  },
  "bairro-nao-reconhecido": {
    titulo: "Bairro não reconhecido",
    descricao: "O bairro informado não consta na lista de bairros da sede.",
    icone: SearchX,
  },
  "em-breve": {
    titulo: "Disponível em breve",
    descricao: "Este módulo ainda não foi entregue nesta demonstração.",
    icone: Construction,
  },
}
