import { readFileSync } from "node:fs"
import { join } from "node:path"

import { count, eq } from "drizzle-orm"

import { localizarObra } from "@/lib/obras/localizacao-obra"
import { SITUACOES_OBRA } from "@/lib/obras/situacao-obra"
import { obra, obraHistorico } from "@/lib/server/db/schema"
import { listarObras } from "@/lib/server/obras/obra-repositorio"
import {
  CAMINHO_DAS_OBRAS_PRE_CARREGADAS,
  garantirObrasPreCarregadas,
  garantirObrasPreCarregadasRegistrando,
} from "@/lib/server/obras/obras-pre-carregadas"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import { criarBancoDeTeste, limparTabelas } from "@/test/banco-teste"

const banco = criarBancoDeTeste()

async function contar(tabela: typeof obra | typeof obraHistorico) {
  const [linha] = await banco.select({ total: count() }).from(tabela)
  return linha?.total ?? 0
}

beforeEach(async () => {
  await limparTabelas(banco)
  jest.spyOn(process.stdout, "write").mockImplementation(() => true)
})

afterAll(async () => {
  await banco.$client.end()
})

describe("garantirObrasPreCarregadas (TI-10, CA-04.18, RF-04.30)", () => {
  it("num banco vazio grava as 8 obras e os históricos, marcadas como exemplo e sintéticas", async () => {
    const resultado = await garantirObrasPreCarregadas(banco)

    expect(resultado).toBe("criadas")
    expect(await contar(obra)).toBe(8)
    expect(await contar(obraHistorico)).toBe(14)
    const obras = await banco.select().from(obra)
    expect(obras.map(({ codigoExemplo }) => codigoExemplo).toSorted()).toEqual(
      Array.from({ length: 8 }, (_, indice) => `DEMO-0${indice + 1}`)
    )
    expect(
      obras.every(({ proveniencia }) => proveniencia === "SINTETICO")
    ).toBe(true)
    expect(obras.every(({ criadoPor }) => criadoPor === "sistema")).toBe(true)
  })

  it("rodar de novo não duplica nada", async () => {
    await garantirObrasPreCarregadas(banco)

    const resultado = await garantirObrasPreCarregadas(banco)

    expect(resultado).toBe("existentes")
    expect(await contar(obra)).toBe(8)
    expect(await contar(obraHistorico)).toBe(14)
  })

  it("em corrida (Promise.all) termina com 8 obras e sem histórico repetido", async () => {
    await Promise.all([
      garantirObrasPreCarregadas(banco),
      garantirObrasPreCarregadas(banco),
      garantirObrasPreCarregadas(banco),
    ])

    expect(await contar(obra)).toBe(8)
    expect(await contar(obraHistorico)).toBe(14)
  })

  it("completa só a que falta, com o histórico dela, e não mexe nas outras", async () => {
    await garantirObrasPreCarregadas(banco)
    await banco
      .update(obra)
      .set({ titulo: "DEMO - Editada pelo analista" })
      .where(eq(obra.codigoExemplo, "DEMO-01"))
    await banco.delete(obra).where(eq(obra.codigoExemplo, "DEMO-03"))
    expect(await contar(obraHistorico)).toBe(11)

    const resultado = await garantirObrasPreCarregadas(banco)

    expect(resultado).toBe("criadas")
    expect(await contar(obra)).toBe(8)
    expect(await contar(obraHistorico)).toBe(14)
    const [editada] = await banco
      .select({ titulo: obra.titulo })
      .from(obra)
      .where(eq(obra.codigoExemplo, "DEMO-01"))
    expect(editada?.titulo).toBe("DEMO - Editada pelo analista")
  })

  it("registrando: devolve sem lançar e loga o resultado", async () => {
    const escrita = jest.spyOn(process.stdout, "write")

    await garantirObrasPreCarregadasRegistrando(banco)
    await garantirObrasPreCarregadasRegistrando(banco)

    const eventos = escrita.mock.calls
      .map(([linha]) => JSON.parse(String(linha)))
      .filter(({ evento }) => evento === "demo.obras_pre_carregadas")
    expect(eventos.map(({ resultado }) => resultado)).toEqual([
      "criadas",
      "existentes",
    ])
  })

  it("falha de leitura vai só ao log quando chamada pelo registrando", async () => {
    const escrita = jest.spyOn(process.stdout, "write")
    jest.spyOn(process, "cwd").mockReturnValue("/pasta-que-nao-existe")

    await expect(
      garantirObrasPreCarregadasRegistrando(banco)
    ).resolves.toBeUndefined()

    jest.restoreAllMocks()
    const [evento] = escrita.mock.calls
      .map(([linha]) => JSON.parse(String(linha)))
      .filter(({ evento }) => evento === "demo.obras_pre_carregadas")
    expect(evento).toMatchObject({ nivel: "error" })
    expect(await contar(obra)).toBe(0)
  })
})

describe("obras de exemplo cumprem o PRD (TI-11, RF-04.29, CA-04.02)", () => {
  async function obrasDeExemplo() {
    await garantirObrasPreCarregadas(banco)
    return listarObras(banco)
  }

  it("têm as 4 situações, e ao menos uma sem localização, uma fora da cobertura e uma com mais de uma situação", async () => {
    const obras = await obrasDeExemplo()

    expect(new Set(obras.map(({ situacao }) => situacao))).toEqual(
      new Set(SITUACOES_OBRA)
    )
    expect(
      obras.some(
        ({ estadoLocalizacao }) => estadoLocalizacao === "sem-localizacao"
      )
    ).toBe(true)
    expect(
      obras.some(
        ({ estadoLocalizacao }) => estadoLocalizacao === "fora-da-cobertura"
      )
    ).toBe(true)
    expect(obras.some(({ historico }) => historico.length > 1)).toBe(true)
  })

  it("o estado e o bairro gravados são os que a regra real calcula para o ponto", async () => {
    const obras = await obrasDeExemplo()
    const territorio = obterDadosTerritorio()

    for (const { titulo, localizacao, estadoLocalizacao, bairroId } of obras) {
      const calculado = localizarObra(localizacao, {
        limite: territorio.limite.geometria.coordinates,
        bairros: territorio.bairros,
      })

      expect({ titulo, estado: estadoLocalizacao, bairroId }).toEqual({
        titulo,
        estado: calculado.estado,
        bairroId:
          calculado.estado === "dentro-de-bairro" ? calculado.bairroId : null,
      })
    }
  })

  it("DEMO-01 é a obra do roteiro: planejada no Centro", async () => {
    const obras = await obrasDeExemplo()

    expect(
      obras.find(({ titulo }) => titulo === "DEMO - Requalificação de praça")
    ).toMatchObject({ situacao: "planejada", bairroId: "uv-10" })
  })

  it("não citam empresa nem contrato: todo título começa com DEMO - e a situação do histórico fecha com a da obra", async () => {
    const obras = await obrasDeExemplo()

    for (const { titulo, situacao, historico } of obras) {
      expect(titulo.startsWith("DEMO - ")).toBe(true)
      expect(historico[0].situacaoNova).toBe(situacao)
      expect(historico.at(-1)?.situacaoAnterior).toBeNull()
    }
  })

  it("o arquivo traz exatamente os códigos DEMO-01 a DEMO-08", () => {
    const texto = readFileSync(
      join(process.cwd(), CAMINHO_DAS_OBRAS_PRE_CARREGADAS),
      "utf-8"
    )
    const codigos = (JSON.parse(texto) as { codigoExemplo: string }[]).map(
      ({ codigoExemplo }) => codigoExemplo
    )

    expect(codigos).toEqual(
      Array.from({ length: 8 }, (_, indice) => `DEMO-0${indice + 1}`)
    )
  })
})
