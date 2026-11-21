import { requisitar } from "@/lib/api/http-client"
import {
  conteudoImportadoSchema,
  importacaoGravadaSchema,
  type ConfirmarImportacao,
  type ConteudoImportado,
  type ImportacaoGravada,
} from "@/lib/validations/importacao-schema"

export type ArquivoParaEnvio = { nome: string; bytes: Uint8Array }

// Só chama os handlers de importação do próprio app (TechSpec §5); o corpo da confirmação é multipart (DV-30).
export const importacaoClient = {
  async conteudoImportado(hash: string): Promise<ConteudoImportado> {
    const resposta = await requisitar(
      `/api/importacoes/conteudo/${encodeURIComponent(hash)}`
    )
    return conteudoImportadoSchema.parse(await resposta.json())
  },
  async confirmar(entrada: {
    arquivo: ArquivoParaEnvio
    dados: ConfirmarImportacao
  }): Promise<ImportacaoGravada> {
    const corpo = new FormData()
    corpo.append(
      "arquivo",
      new File([new Uint8Array(entrada.arquivo.bytes)], entrada.arquivo.nome, {
        type: "text/csv",
      })
    )
    corpo.append("dados", JSON.stringify(entrada.dados))
    const resposta = await requisitar("/api/importacoes", {
      metodo: "POST",
      corpo,
    })
    return importacaoGravadaSchema.parse(await resposta.json())
  },
}
