import "@/test/polyfills-arquivo-jsdom"

import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { AssistenteImportacao } from "@/components/importacao/assistente-importacao"
import { ApiError } from "@/lib/api/api-error"
import { datasetsClient } from "@/lib/api/datasets-client"
import { importacaoClient } from "@/lib/api/importacao-client"
import {
  BYTES_PNG,
  bytesLatin1,
  bytesUtf8,
} from "@/lib/importacao/__fixtures__/csv-bytes"
import { BAIRROS } from "@/lib/importacao/__fixtures__/analise"
import { renderComProviders } from "@/test/render-com-providers"

const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))
jest.mock("@/lib/api/importacao-client", () => ({
  importacaoClient: { conteudoImportado: jest.fn(), confirmar: jest.fn() },
}))
jest.mock("@/lib/api/datasets-client", () => ({
  datasetsClient: { listar: jest.fn() },
}))

type Usuario = ReturnType<typeof userEvent.setup>

const PASTA_SINTETICOS = join(process.cwd(), "dados", "sinteticos")

function sintetico(caminho: string): Uint8Array {
  return new Uint8Array(readFileSync(join(PASTA_SINTETICOS, caminho)))
}

function preparar(): Usuario {
  // `applyAccept: false`: o teste de extensão errada precisa chegar ao motor, como o arrastar e soltar chega.
  const usuario = userEvent.setup({ applyAccept: false })
  renderComProviders(<AssistenteImportacao bairros={BAIRROS} />)
  return usuario
}

async function enviar(usuario: Usuario, nome: string, bytes: Uint8Array) {
  const arquivo = new File([new Uint8Array(bytes)], nome, {
    type: "text/csv",
  })
  await usuario.upload(screen.getByLabelText("Arquivo CSV"), arquivo)
}

async function escolher(usuario: Usuario, campo: string, opcao: string) {
  await usuario.click(screen.getByRole("combobox", { name: campo }))
  await usuario.click(await screen.findByRole("option", { name: opcao }))
}

async function enviarRoteiro(usuario: Usuario) {
  await enviar(
    usuario,
    "saude-roteiro_DEMO.csv",
    sintetico("saude-roteiro_DEMO.csv")
  )
  await screen.findByRole("heading", { name: "Colunas do arquivo" })
}

async function continuar(usuario: Usuario) {
  await usuario.click(screen.getByRole("button", { name: "Continuar" }))
}

async function decidirBairros(usuario: Usuario) {
  await escolher(
    usuario,
    "Bairro para o nome Morada",
    "Morada dos Ventos (UV 20)"
  )
  await escolher(usuario, "Bairro para o nome Aranaú", "Fora da cobertura")
}

// `restoreMocks` zera as implementações dos `jest.fn()` do módulo: o padrão é "conteúdo ainda não importado".
beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(importacaoClient.conteudoImportado)
    .mockResolvedValue({ importado: false })
  jest.mocked(datasetsClient.listar).mockResolvedValue([])
})

describe("AssistenteImportacao: envio", () => {
  it("abre no envio com os limites escritos e sem os passos seguintes", () => {
    preparar()

    expect(
      screen.getByRole("heading", { name: "Enviar arquivo" })
    ).toBeVisible()
    expect(screen.getByText(/Até 5 MB e 10\.000 linhas/)).toBeVisible()
    expect(
      screen.queryByRole("heading", { name: "Colunas do arquivo" })
    ).toBeNull()
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
      "Enviar arquivo"
    )
  })

  it.each([
    ["imagem com nome .csv", "foto.csv", BYTES_PNG, /o conteúdo não é texto/],
    ["extensão .txt", "casos.txt", bytesUtf8("a,b\n1,2"), /extensão \.csv/],
    [
      "Latin-1 com acento",
      "casos.csv",
      bytesLatin1("bairro,ano,casos\nSão Benedito,2025,1"),
      /não está em UTF-8/,
    ],
    [
      "coluna com dado pessoal",
      "casos.csv",
      sintetico("adversos/dado-pessoal-coluna_DEMO.csv"),
      /a coluna nome_paciente parece conter dado pessoal/,
    ],
    [
      "CPF numa célula",
      "casos.csv",
      sintetico("adversos/dado-pessoal-cpf_DEMO.csv"),
      /a linha 3 tem um valor no formato de CPF/,
    ],
    [
      "aspas não fechadas",
      "casos.csv",
      sintetico("adversos/aspas-nao-fechadas_DEMO.csv"),
      /a linha 3 tem aspas/,
    ],
    [
      "só o cabeçalho",
      "casos.csv",
      sintetico("adversos/sem-linhas_DEMO.csv"),
      /nenhuma linha de dados/,
    ],
  ])(
    "recusa %s com o motivo e fica no envio",
    async (_, nome, bytes, mensagem) => {
      const usuario = preparar()

      await enviar(usuario, nome, bytes)

      expect(await screen.findByRole("alert")).toHaveTextContent(mensagem)
      expect(
        screen.getByRole("heading", { name: "Enviar arquivo" })
      ).toBeVisible()
      expect(
        screen.queryByRole("heading", { name: "Colunas do arquivo" })
      ).toBeNull()
    }
  )

  it("a recusa por dado pessoal não mostra o valor da célula", async () => {
    const usuario = preparar()

    await enviar(
      usuario,
      "casos.csv",
      sintetico("adversos/dado-pessoal-coluna_DEMO.csv")
    )

    expect(await screen.findByRole("alert")).not.toHaveTextContent("Fulano")
  })
})

describe("AssistenteImportacao: colunas", () => {
  it("mostra o separador detectado, a prévia como texto e as colunas sugeridas", async () => {
    const usuario = preparar()

    await enviarRoteiro(usuario)

    expect(
      screen.getByText("Separador detectado: ponto e vírgula (;).")
    ).toBeVisible()
    expect(
      screen.getByText(/16 linhas de dados lidas \(UTF-8 com BOM\)/)
    ).toBeVisible()
    expect(screen.getByRole("columnheader", { name: "casos" })).toBeVisible()
    expect(
      screen.getByRole("cell", { name: "Antônio Livino da Silveira" })
    ).toBeVisible()
    expect(
      screen.getByRole("combobox", { name: "Coluna do bairro" })
    ).toHaveTextContent("bairro")
    expect(
      screen.getByRole("combobox", { name: "Coluna do período (ano ou mês)" })
    ).toHaveTextContent("ano")
    expect(
      screen.getByRole("combobox", { name: "Coluna dos casos" })
    ).toHaveTextContent("casos")
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled()
  })

  it("mostra só as 20 primeiras linhas na prévia e o total lido", async () => {
    const usuario = preparar()
    const linhas = Array.from({ length: 25 }, (_, i) => `Centro,${2000 + i},1`)

    await enviar(
      usuario,
      "grande.csv",
      bytesUtf8(["bairro,ano,casos", ...linhas].join("\n"))
    )

    expect(await screen.findByText(/25 linhas de dados lidas/)).toBeVisible()
    expect(screen.getAllByRole("row")).toHaveLength(21)
  })

  it("trocar o separador reanalisa: com a vírgula o arquivo vira uma coluna e não avança", async () => {
    const usuario = preparar()
    await enviarRoteiro(usuario)

    await escolher(usuario, "Separador usado na leitura", "vírgula (,)")

    expect(
      screen.getByRole("columnheader", { name: "bairro;ano;casos" })
    ).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent(
      /Escolha uma coluna diferente/
    )
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
    // O separador detectado continua informado para o analista poder voltar a ele.
    expect(
      screen.getByText("Separador detectado: ponto e vírgula (;).")
    ).toBeVisible()

    await escolher(usuario, "Separador usado na leitura", "ponto e vírgula (;)")

    expect(screen.getByRole("columnheader", { name: "casos" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled()
  })

  it("sem uma das três colunas não avança, e lista as colunas ignoradas", async () => {
    const usuario = preparar()
    await enviar(
      usuario,
      "casos.csv",
      bytesUtf8("bairro,ano,casos,observacao\nCentro,2025,9,x")
    )
    await screen.findByRole("heading", { name: "Colunas do arquivo" })
    expect(screen.getByText("Colunas ignoradas: observacao.")).toBeVisible()

    await escolher(usuario, "Coluna dos casos", "Nenhuma")

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
    expect(
      screen.getByText("Colunas ignoradas: casos, observacao.")
    ).toBeVisible()
  })

  it("escolher a mesma coluna para dois campos também bloqueia", async () => {
    const usuario = preparar()
    await enviarRoteiro(usuario)

    await escolher(usuario, "Coluna dos casos", "ano")

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
  })

  it("o conteúdo do arquivo é texto: fórmula e HTML aparecem literais", async () => {
    const usuario = preparar()

    await enviar(
      usuario,
      "casos.csv",
      bytesUtf8("bairro,ano,casos\n'=SOMA(A1),2025,1\n<b>x</b>,2025,2")
    )

    expect(await screen.findByRole("cell", { name: "=SOMA(A1)" })).toBeVisible()
    expect(screen.getByRole("cell", { name: "<b>x</b>" })).toBeVisible()
    expect(document.querySelector("b")).toBeNull()
  })
})

describe("AssistenteImportacao: bairros", () => {
  it("lista os reconhecidos para conferência e deixa Continuar travado até as duas decisões", async () => {
    const usuario = preparar()
    await enviarRoteiro(usuario)

    await continuar(usuario)

    expect(
      screen.getByRole("heading", { name: "Bairros do arquivo" })
    ).toBeVisible()
    const saoBenedito = screen.getByRole("row", { name: /SAO BENEDITO/ })
    expect(within(saoBenedito).getByText("Reconhecido")).toBeVisible()
    expect(within(saoBenedito).getByText("São Benedito (UV 3)")).toBeVisible()
    expect(screen.getByRole("row", { name: /^Centro/ })).toHaveTextContent(
      "Centro (UV 10)"
    )
    expect(screen.getByRole("row", { name: /Morada/ })).toHaveTextContent(
      "Ambíguo: Morada dos Ventos (UV 20), Morada Nova (UV 21)"
    )
    expect(screen.getByRole("row", { name: /Aranaú/ })).toHaveTextContent(
      "Não reconhecido"
    )
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 nomes ainda sem decisão"
    )
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()

    await escolher(
      usuario,
      "Bairro para o nome Morada",
      "Morada dos Ventos (UV 20)"
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "1 nome ainda sem decisão"
    )
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()

    await escolher(usuario, "Bairro para o nome Aranaú", "Fora da cobertura")

    expect(screen.getByRole("status")).toHaveTextContent(
      "Todos têm bairro ou estão fora da cobertura."
    )
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled()
  })

  it("o nome ambíguo oferece os candidatos primeiro e o não reconhecido, os 24 bairros", async () => {
    const usuario = preparar()
    await enviarRoteiro(usuario)
    await continuar(usuario)

    await usuario.click(
      screen.getByRole("combobox", { name: "Bairro para o nome Morada" })
    )
    const candidatos = within(
      await screen.findByRole("group", { name: "Candidatos" })
    )
    expect(
      candidatos.getAllByRole("option").map((opcao) => opcao.textContent)
    ).toEqual(["Morada dos Ventos (UV 20)", "Morada Nova (UV 21)"])
  })

  it("a decisão fica na linha e voltar às colunas e avançar de novo a mantém", async () => {
    const usuario = preparar()
    await enviarRoteiro(usuario)
    await continuar(usuario)
    await decidirBairros(usuario)

    await usuario.click(screen.getByRole("button", { name: "Voltar" }))
    await continuar(usuario)

    expect(
      screen.getByRole("combobox", { name: "Bairro para o nome Morada" })
    ).toHaveTextContent("Morada dos Ventos (UV 20)")
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled()
  })

  it("nomes sem nenhum bairro correspondente mostram o texto do arquivo, sem interpretar", async () => {
    const usuario = preparar()
    await enviar(
      usuario,
      "casos.csv",
      bytesUtf8("bairro,ano,casos\n<b>x</b>,2025,2")
    )
    await screen.findByRole("heading", { name: "Colunas do arquivo" })

    await continuar(usuario)

    expect(screen.getByRole("row", { name: /<b>x<\/b>/ })).toHaveTextContent(
      "Não reconhecido"
    )
    expect(document.querySelector("b")).toBeNull()
  })
})

describe("AssistenteImportacao: validação", () => {
  it("com as decisões feitas a validação do roteiro fica limpa e o foco vai ao título do passo", async () => {
    const usuario = preparar()
    await enviarRoteiro(usuario)
    await continuar(usuario)
    await decidirBairros(usuario)

    await continuar(usuario)

    const titulo = screen.getByRole("heading", { name: "Validação" })
    expect(titulo).toHaveFocus()
    const resumo = within(screen.getByLabelText("Resumo da validação"))
    expect(
      resumo.getByText("Linhas lidas").nextElementSibling
    ).toHaveTextContent("16")
    expect(resumo.getByText("Com erro").nextElementSibling).toHaveTextContent(
      "0"
    )
    expect(
      resumo.getByText("Fora da cobertura").nextElementSibling
    ).toHaveTextContent("2")
    expect(screen.getByRole("status")).toHaveTextContent("Validação sem erros")
    expect(
      screen.queryByRole("heading", { name: "Problemas por linha" })
    ).toBeNull()
  })

  it("um arquivo com duplicata mostra o motivo e as duas linhas, e avisa que há erro", async () => {
    const usuario = preparar()
    await enviar(
      usuario,
      "duplicata_DEMO.csv",
      sintetico("adversos/duplicata_DEMO.csv")
    )
    await screen.findByRole("heading", { name: "Colunas do arquivo" })
    await continuar(usuario)

    await continuar(usuario)

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Há erros que bloqueiam/
    )
    expect(screen.getByText(/Linhas 2 e 3: Duplicata/)).toBeVisible()
  })

  it("erros de casos e período aparecem com a linha e sem repetir o valor", async () => {
    const usuario = preparar()
    await enviar(
      usuario,
      "casos.csv",
      sintetico("adversos/casos-invalidos_DEMO.csv")
    )
    await screen.findByRole("heading", { name: "Colunas do arquivo" })
    await continuar(usuario)
    await continuar(usuario)

    const lista = screen.getByRole("list", { name: "" })
    expect(lista).toHaveTextContent(/Linha 2: Casos negativo/)
    expect(lista).toHaveTextContent(
      /Linha 3: Casos não é um número inteiro válido/
    )
    expect(lista).not.toHaveTextContent("abc")
  })

  it("casos vazio é aviso e o arquivo continua pronto", async () => {
    const usuario = preparar()
    await enviar(
      usuario,
      "casos.csv",
      sintetico("adversos/valores-vazios_DEMO.csv")
    )
    await screen.findByRole("heading", { name: "Colunas do arquivo" })
    await continuar(usuario)
    await continuar(usuario)

    expect(screen.getByRole("status")).toHaveTextContent(
      "Validação sem erros, com 2 avisos"
    )
    expect(screen.getByText(/Linha 3: Casos vazio/)).toBeVisible()
  })
})

describe("AssistenteImportacao: cancelar", () => {
  it("cancelar em qualquer passo volta ao envio sem nenhum estado do arquivo", async () => {
    const usuario = preparar()
    await enviarRoteiro(usuario)
    await continuar(usuario)
    await escolher(
      usuario,
      "Bairro para o nome Morada",
      "Morada dos Ventos (UV 20)"
    )

    await usuario.click(
      screen.getByRole("button", { name: "Cancelar importação" })
    )

    expect(
      screen.getByRole("heading", { name: "Enviar arquivo" })
    ).toHaveFocus()
    expect(screen.getByLabelText("Arquivo CSV")).toHaveValue("")
    expect(screen.queryByRole("table")).toBeNull()

    // Enviar o mesmo arquivo de novo recomeça do zero: a decisão anterior não volta.
    await enviarRoteiro(usuario)
    await continuar(usuario)
    expect(screen.getByRole("status")).toHaveTextContent(
      "2 nomes ainda sem decisão"
    )
  })

  it.each(["colunas", "validação"])(
    "o botão Cancelar existe no passo de %s",
    async (passo) => {
      const usuario = preparar()
      await enviar(
        usuario,
        "duplicata_DEMO.csv",
        sintetico("adversos/duplicata_DEMO.csv")
      )
      await screen.findByRole("heading", { name: "Colunas do arquivo" })
      if (passo === "validação") {
        await continuar(usuario)
        await continuar(usuario)
      }

      expect(
        screen.getByRole("button", { name: "Cancelar importação" })
      ).toBeEnabled()
    }
  )
})

async function chegarNaConfirmacao(usuario: Usuario) {
  await enviarRoteiro(usuario)
  await continuar(usuario)
  await decidirBairros(usuario)
  await continuar(usuario)
  await continuar(usuario)
  await screen.findByRole("heading", { name: "Confirmar importação" })
}

async function preencherMetadados(usuario: Usuario) {
  await usuario.type(
    screen.getByLabelText("Nome do dataset"),
    "Roteiro 2025-2026"
  )
  await usuario.type(screen.getByLabelText("Indicador"), "Casos notificados")
  await usuario.type(screen.getByLabelText("Fonte"), "Planilha de roteiro")
}

describe("AssistenteImportacao: conteúdo já importado (TU-23, CA-02.14)", () => {
  it("consulta o SHA-256 dos bytes, mostra jaImportado e bloqueia o avanço, qualquer que seja o nome do arquivo", async () => {
    jest.mocked(importacaoClient.conteudoImportado).mockResolvedValue({
      importado: true,
      datasetId: "d1",
      nome: "Roteiro 2025-2026",
      numero: 1,
    })
    const usuario = preparar()

    await enviar(
      usuario,
      "copia-renomeada.csv",
      sintetico("saude-roteiro_DEMO.csv")
    )

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Este arquivo já foi importado no dataset Roteiro 2025-2026 (versão 1)."
    )
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
    expect(importacaoClient.conteudoImportado).toHaveBeenCalledWith(
      createHash("sha256")
        .update(sintetico("saude-roteiro_DEMO.csv"))
        .digest("hex")
    )
  })

  it("com o conteúdo novo o aviso não aparece e o avanço segue liberado", async () => {
    const usuario = preparar()

    await enviarRoteiro(usuario)

    expect(screen.queryByText(/já foi importado/)).toBeNull()
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled()
  })

  it("se a consulta falhar o assistente segue, porque o servidor decide na confirmação", async () => {
    jest
      .mocked(importacaoClient.conteudoImportado)
      .mockRejectedValue(new ApiError("SEM_CONEXAO", "Sem conexão."))
    const usuario = preparar()

    await enviarRoteiro(usuario)

    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled()
  })
})

describe("AssistenteImportacao: confirmar (RF-02.19, RF-02.22)", () => {
  it("só chega à confirmação com a validação sem erros", async () => {
    const usuario = preparar()
    await enviar(
      usuario,
      "duplicata_DEMO.csv",
      sintetico("adversos/duplicata_DEMO.csv")
    )
    await screen.findByRole("heading", { name: "Colunas do arquivo" })
    await continuar(usuario)
    await continuar(usuario)

    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled()
  })

  it("envia o arquivo, o mapeamento, as decisões e os metadados, e vai à Saúde com a versão gravada", async () => {
    jest
      .mocked(importacaoClient.confirmar)
      .mockResolvedValue({ datasetId: "d1", versaoId: "v-123", numero: 1 })
    const usuario = preparar()
    await chegarNaConfirmacao(usuario)
    await preencherMetadados(usuario)

    await usuario.click(
      screen.getByRole("button", { name: "Confirmar importação" })
    )

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/saude?versao=v-123")
    )
    const [envio] = jest.mocked(importacaoClient.confirmar).mock.calls[0] ?? []
    expect(envio?.arquivo.nome).toBe("saude-roteiro_DEMO.csv")
    expect(envio?.dados).toEqual({
      separador: ";",
      mapeamento: { bairro: 0, periodo: 1, casos: 2 },
      decisoes: [
        { nomeNormalizado: "morada", tipo: "bairro", bairroId: "uv-20" },
        { nomeNormalizado: "aranau", tipo: "fora-da-cobertura" },
      ],
      metadados: {
        nome: "Roteiro 2025-2026",
        indicador: "Casos notificados",
        fonte: "Planilha de roteiro",
      },
      destino: { tipo: "novo" },
    })
  })

  it("metadados vazios mostram o erro no campo e não enviam nada", async () => {
    const usuario = preparar()
    await chegarNaConfirmacao(usuario)

    await usuario.click(
      screen.getByRole("button", { name: "Confirmar importação" })
    )

    const campo = screen
      .getByLabelText("Nome do dataset")
      .closest("[data-slot=field]") as HTMLElement
    expect(
      await within(campo).findByText(
        "O nome do dataset deve ter no mínimo 3 caracteres."
      )
    ).toBeVisible()
    expect(importacaoClient.confirmar).not.toHaveBeenCalled()
  })

  it("nova versão mostra os metadados do dataset só para leitura", async () => {
    jest.mocked(datasetsClient.listar).mockResolvedValue([
      {
        id: "7d0c2b8e-1f3a-4c55-9a0e-2d5b8f7c4e10",
        nome: "Roteiro 2025-2026",
        indicador: "Casos notificados (sintético)",
        fonte: "Planilha de roteiro",
        unidade: "casos",
        proveniencia: "SINTETICO",
        preCarregado: false,
        versoes: [],
      },
    ])
    const usuario = preparar()
    await chegarNaConfirmacao(usuario)
    const nova = screen.getByRole("radio", {
      name: "Nova versão de um dataset existente",
    })
    await waitFor(() => expect(nova).toBeEnabled())

    await usuario.click(nova)

    expect(screen.getByLabelText("Nome do dataset")).toHaveValue(
      "Roteiro 2025-2026"
    )
    expect(screen.getByLabelText("Nome do dataset")).toHaveAttribute("readonly")
    expect(screen.getByLabelText("Fonte")).toHaveValue("Planilha de roteiro")
  })

  it("401 mostra sessaoExpirada com o link para entrar e voltar ao assistente", async () => {
    jest.mocked(importacaoClient.confirmar).mockRejectedValue(
      new ApiError("NAO_AUTENTICADO", "Entre para acessar esta área.", {
        status: 401,
      })
    )
    const usuario = preparar()
    await chegarNaConfirmacao(usuario)
    await preencherMetadados(usuario)

    await usuario.click(
      screen.getByRole("button", { name: "Confirmar importação" })
    )

    const aviso = await screen.findByRole("alert")
    expect(aviso).toHaveTextContent(
      "Sua sessão expirou. Entre de novo e reenvie o arquivo; nada foi gravado."
    )
    const href =
      within(aviso)
        .getByRole("link", { name: "Entrar" })
        .getAttribute("href") ?? ""
    expect(new URL(href, "http://x").searchParams.get("retorno")).toBe(
      "/saude/importar"
    )
    expect(mockPush).not.toHaveBeenCalled()
  })

  it.each([
    [
      409,
      "CONTEUDO_JA_IMPORTADO",
      "Este arquivo já foi importado no dataset X (versão 1).",
    ],
    [413, "ARQUIVO_GRANDE_DEMAIS", "O arquivo é maior que o limite de 5 MB."],
    [422, "IMPORTACAO_INVALIDA", "A importação não pôde ser confirmada."],
  ])(
    "%s mostra a mensagem do envelope e fica na confirmação",
    async (status, code, mensagem) => {
      jest
        .mocked(importacaoClient.confirmar)
        .mockRejectedValue(new ApiError(code, mensagem, { status }))
      const usuario = preparar()
      await chegarNaConfirmacao(usuario)
      await preencherMetadados(usuario)

      await usuario.click(
        screen.getByRole("button", { name: "Confirmar importação" })
      )

      expect(await screen.findByRole("alert")).toHaveTextContent(mensagem)
      expect(
        screen.getByRole("heading", { name: "Confirmar importação" })
      ).toBeVisible()
      expect(mockPush).not.toHaveBeenCalled()
    }
  )
})
