import type { Obra } from "@/lib/validations/obra-schema"

/** Obra válida e mínima para os testes; cada teste sobrescreve só o que importa. */
export function montarObra(sobrescritas: Partial<Obra> = {}): Obra {
  return {
    id: "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f",
    titulo: "DEMO - Obra de teste",
    situacao: "planejada",
    descricao: null,
    categoria: null,
    secretaria: null,
    dataInicio: null,
    dataPrevista: null,
    valorPrevistoCentavos: null,
    localizacao: null,
    estadoLocalizacao: "sem-localizacao",
    bairroId: null,
    proveniencia: "SINTETICO",
    atualizadoEm: "2026-11-21T14:05:00.000Z",
    historico: [
      {
        situacaoAnterior: null,
        situacaoNova: "planejada",
        autorNome: "Equipe da demonstração",
        registradoEm: "2026-11-21T14:05:00.000Z",
      },
    ],
    ...sobrescritas,
  }
}
