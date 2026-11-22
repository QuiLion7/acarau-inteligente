import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SeletorBairro } from "@/components/territorio/seletor-bairro"
import type { SelecaoBairro } from "@/lib/filtros/filtros-url"
import { BAIRROS_SAUDE } from "@/test/saude-fixtures"

const onSelecionar = jest.fn()
const onLimpar = jest.fn()

function renderizar(selecao: SelecaoBairro = { tipo: "todos" }) {
  const propriedades = {
    id: "seletor-bairro",
    bairros: BAIRROS_SAUDE,
    onSelecionar,
    onLimpar,
  }
  const resultado = render(
    <SeletorBairro {...propriedades} selecao={selecao} />
  )
  return {
    ...resultado,
    atualizar: (nova: SelecaoBairro) =>
      resultado.rerender(<SeletorBairro {...propriedades} selecao={nova} />),
  }
}

// Com a lista aberta o Base UI esconde o rótulo da árvore de acessibilidade: o campo é buscado uma vez, ainda fechado.
const campo = () => screen.getByRole("combobox", { name: "Bairro" })

beforeEach(() => jest.clearAllMocks())

describe("SeletorBairro: escolher (TU-12, CA-03.08)", () => {
  it("digitar 'centro' mostra só o Centro e escolher chama onSelecionar com o ID", async () => {
    const usuario = userEvent.setup()
    renderizar()
    const entrada = campo()

    await usuario.type(entrada, "centro")
    const opcoes = await screen.findAllByRole("option")
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual(["Centro (UV 10)"])
    await usuario.click(opcoes[0]!)

    expect(onSelecionar).toHaveBeenCalledTimes(1)
    expect(onSelecionar).toHaveBeenCalledWith("uv-10")
    expect(onLimpar).not.toHaveBeenCalled()
  })

  it("a busca ignora acento e caixa e aceita o código da UV", async () => {
    const usuario = userEvent.setup()
    renderizar()

    const entrada = campo()

    await usuario.type(entrada, "OUTRA")
    expect(
      (await screen.findAllByRole("option")).map((opcao) => opcao.textContent)
    ).toEqual(["Outra Banda (UV 1)"])

    await usuario.clear(entrada)
    await usuario.type(entrada, "uv 20")
    expect(
      (await screen.findAllByRole("option")).map((opcao) => opcao.textContent)
    ).toEqual(["Morada dos Ventos (UV 20)"])
  })

  it("sem termo oferece 'Todos os bairros' e os bairros; escolher 'Todos os bairros' chama onLimpar", async () => {
    const usuario = userEvent.setup()
    renderizar({ tipo: "bairro", bairro: BAIRROS_SAUDE[1]! })

    await usuario.click(campo())
    const opcoes = await screen.findAllByRole("option")
    expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
      "Todos os bairros",
      "Outra Banda (UV 1)",
      "Centro (UV 10)",
      "Rodagem (UV 13)",
      "Morada dos Ventos (UV 20)",
    ])
    await usuario.click(opcoes[0]!)

    expect(onLimpar).toHaveBeenCalledTimes(1)
    expect(onSelecionar).not.toHaveBeenCalled()
  })

  it("termo sem resultado mostra 'Nenhum bairro encontrado.' e nenhuma opção", async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.type(campo(), "zzz")

    expect(await screen.findByText("Nenhum bairro encontrado.")).toBeVisible()
    expect(screen.queryAllByRole("option")).toHaveLength(0)
  })
})

describe("SeletorBairro: reflete a seleção de fora (TU-13, CA-03.09)", () => {
  it("mostra o bairro selecionado e acompanha a troca vinda do mapa, do ranking ou da tabela", () => {
    const { atualizar } = renderizar({ tipo: "todos" })
    expect(campo()).toHaveValue("Todos os bairros")

    atualizar({ tipo: "bairro", bairro: BAIRROS_SAUDE[1]! })
    expect(campo()).toHaveValue("Centro (UV 10)")

    atualizar({ tipo: "todos" })
    expect(campo()).toHaveValue("Todos os bairros")
  })

  it("bairro não reconhecido deixa o campo vazio, sem exibir valor algum", () => {
    renderizar({ tipo: "nao-reconhecido" })

    expect(campo()).toHaveValue("")
  })
})
