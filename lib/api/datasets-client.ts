import { requisitar } from "@/lib/api/http-client"
import {
  listaDatasetsSchema,
  relatorioVersaoSchema,
  versaoResumoSchema,
  type DatasetComVersoes,
  type RelatorioVersao,
  type VersaoResumo,
} from "@/lib/validations/datasets-schema"

const caminhoDaVersao = (versaoId: string) =>
  `/api/datasets/versoes/${encodeURIComponent(versaoId)}`

// Só chama os handlers de datasets do próprio app (TechSpec §5); respostas validadas na chegada.
export const datasetsClient = {
  async listar(): Promise<DatasetComVersoes[]> {
    const resposta = await requisitar("/api/datasets")
    return listaDatasetsSchema.parse(await resposta.json()).datasets
  },
  async relatorio(versaoId: string): Promise<RelatorioVersao> {
    const resposta = await requisitar(`${caminhoDaVersao(versaoId)}/relatorio`)
    return relatorioVersaoSchema.parse(await resposta.json())
  },
  async publicar(versaoId: string): Promise<VersaoResumo> {
    const resposta = await requisitar(
      `${caminhoDaVersao(versaoId)}/publicacao`,
      {
        metodo: "POST",
      }
    )
    return versaoResumoSchema.parse(await resposta.json())
  },
  async despublicar(versaoId: string): Promise<VersaoResumo> {
    const resposta = await requisitar(
      `${caminhoDaVersao(versaoId)}/publicacao`,
      {
        metodo: "DELETE",
      }
    )
    return versaoResumoSchema.parse(await resposta.json())
  },
}
