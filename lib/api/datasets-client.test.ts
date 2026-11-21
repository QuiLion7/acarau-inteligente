import { datasetsClient } from "@/lib/api/datasets-client"

let fetchSimulado: jest.SpyInstance<
  ReturnType<typeof fetch>,
  Parameters<typeof fetch>
>

beforeEach(() => {
  fetchSimulado = jest.spyOn(globalThis, "fetch")
})

const ID = "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10"
const VERSAO = {
  id: ID,
  numero: 1,
  situacao: "publicado",
  autor: "Analista Demo",
  importadoEm: "2026-11-20T14:02:11.000Z",
  publicadoEm: "2026-11-20T15:00:00.000Z",
  granularidade: "ano",
  periodos: ["2025", "2026"],
  linhasGravadas: 16,
}
const DATASET = {
  id: "d1",
  nome: "Roteiro",
  indicador: "Casos",
  fonte: "Planilha",
  unidade: "casos",
  proveniencia: "SINTETICO",
  preCarregado: false,
}

describe("datasetsClient", () => {
  it("listar devolve os datasets com as versões", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json({ datasets: [{ ...DATASET, versoes: [VERSAO] }] })
    )

    const datasets = await datasetsClient.listar()

    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/datasets",
      expect.objectContaining({ method: "GET" })
    )
    expect(datasets[0]?.versoes[0]).toMatchObject({
      numero: 1,
      situacao: "publicado",
    })
  })

  it("listar rejeita dataset sem a etiqueta SINTETICO", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json({
        datasets: [{ ...DATASET, proveniencia: "REAL", versoes: [] }],
      })
    )

    await expect(datasetsClient.listar()).rejects.toThrow()
  })

  it("relatorio lê a versão, o dataset e o relatório do endpoint da versão", async () => {
    fetchSimulado.mockResolvedValue(
      Response.json({
        versao: VERSAO,
        dataset: DATASET,
        relatorio: {
          nomeArquivo: "a.csv",
          hashConteudo: "a".repeat(64),
          separador: ";",
          encoding: "UTF-8",
          mapeamento: { bairro: "bairro", periodo: "ano", casos: "casos" },
          colunasIgnoradas: [],
          decisoesBairro: [],
          contagens: {
            lidas: 1,
            gravadas: 1,
            semDado: 0,
            foraDaCobertura: 0,
            avisos: 0,
          },
          granularidade: "ano",
          periodos: ["2025"],
        },
      })
    )

    const relatorio = await datasetsClient.relatorio(ID)

    expect(fetchSimulado).toHaveBeenCalledWith(
      `/api/datasets/versoes/${ID}/relatorio`,
      expect.objectContaining({ method: "GET" })
    )
    expect(relatorio.relatorio.nomeArquivo).toBe("a.csv")
  })

  it.each([
    ["publicar", "POST"],
    ["despublicar", "DELETE"],
  ] as const)(
    "%s chama %s no endpoint de publicação da versão",
    async (acao, metodo) => {
      fetchSimulado.mockResolvedValue(Response.json(VERSAO))

      const versao = await datasetsClient[acao](ID)

      expect(fetchSimulado).toHaveBeenCalledWith(
        `/api/datasets/versoes/${ID}/publicacao`,
        expect.objectContaining({ method: metodo })
      )
      expect(versao.id).toBe(ID)
    }
  )
})
