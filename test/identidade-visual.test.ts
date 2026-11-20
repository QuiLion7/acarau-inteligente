import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { AVISO_DEMONSTRACAO } from "@/lib/config/textos-demonstracao"

// CA-00.09 / RN-00.05: nada de brasão nem de "sistema oficial". A única ocorrência permitida é a
// negação do aviso ("não constitui sistema oficial").
const PASTAS = ["app", "components", "lib/config"]
const EXTENSOES = /\.(tsx?|css)$/
const TESTES = /\.(test|int\.test)\.tsx?$/
const BRASAO = /bras[aã]o/i
const SISTEMA_OFICIAL_SEM_NEGACAO = /(?<!não constitui )sistema oficial/i

function arquivosDe(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(pasta, entrada.name)
    if (entrada.isDirectory()) return arquivosDe(caminho)
    return EXTENSOES.test(entrada.name) && !TESTES.test(entrada.name)
      ? [caminho]
      : []
  })
}

function infracoesEm(texto: string): string[] {
  return [
    ...(BRASAO.test(texto) ? ["brasão"] : []),
    ...(SISTEMA_OFICIAL_SEM_NEGACAO.test(texto) ? ["sistema oficial"] : []),
  ]
}

describe("identidade visual da demonstração", () => {
  it("não há brasão nem 'sistema oficial' fora da negação do aviso", () => {
    const infracoes = PASTAS.flatMap(arquivosDe).flatMap((arquivo) =>
      infracoesEm(readFileSync(arquivo, "utf8")).map(
        (termo) => `${arquivo}: ${termo}`
      )
    )

    expect(infracoes).toEqual([])
  })

  it("aceita o aviso completo, que nega ser sistema oficial", () => {
    expect(AVISO_DEMONSTRACAO).toContain("não constitui sistema oficial")
    expect(infracoesEm(AVISO_DEMONSTRACAO)).toEqual([])
  })

  it("reconhece os termos proibidos fora da negação", () => {
    expect(infracoesEm("Este é o sistema oficial da Prefeitura")).toEqual([
      "sistema oficial",
    ])
    expect(infracoesEm("Brasão do município")).toEqual(["brasão"])
    expect(infracoesEm("brasao")).toEqual(["brasão"])
  })
})
