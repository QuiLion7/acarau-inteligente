import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRef } from "react"

import { FormObra, type ControleDoFormObra } from "@/components/obras/form-obra"
import { ApiError } from "@/lib/api/api-error"
import { obrasClient } from "@/lib/api/obras-client"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import "@/test/polyfill-pointer-event"
import { renderComProviders } from "@/test/render-com-providers"

const refresh = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/api/obras-client", () => ({
  obrasClient: { criar: jest.fn(), editar: jest.fn() },
}))

const { bairros, limite } = obterDadosTerritorio()
const TERRITORIO = { limite: limite.geometria.coordinates, bairros }
const CENTRO = bairros.find(({ id }) => id === "uv-10")!
const PONTO_CENTRO = {
  longitude: CENTRO.pontoInterior[0],
  latitude: CENTRO.pontoInterior[1],
}
const PONTO_FORA_DO_LIMITE = { longitude: -38.5, latitude: -3.7 }
const PONTO_FORA_DA_COBERTURA = { longitude: -40.14, latitude: -2.88 }

beforeEach(() => jest.clearAllMocks())

type Opcoes = {
  obra?: Parameters<typeof FormObra>[0]["obra"]
  onSalvo?: jest.Mock
  onCancelar?: jest.Mock
  onPontoProvisorioChange?: jest.Mock
}

function renderizar({
  obra = null,
  onSalvo = jest.fn(),
  onCancelar = jest.fn(),
  onPontoProvisorioChange = jest.fn(),
}: Opcoes = {}) {
  const controle = createRef<ControleDoFormObra>()
  renderComProviders(
    <FormObra
      ref={controle}
      obra={obra}
      territorio={TERRITORIO}
      onSalvo={onSalvo}
      onCancelar={onCancelar}
      onPontoProvisorioChange={onPontoProvisorioChange}
    />
  )
  return { controle, onSalvo, onCancelar, onPontoProvisorioChange }
}

const grupoLocalizacao = () =>
  screen.getByRole("group", { name: "Localização" })
const campo = (rotulo: string) => screen.getByLabelText(rotulo)

async function digitar(rotulo: string, texto: string) {
  const entrada = campo(rotulo)
  await userEvent.clear(entrada)
  await userEvent.type(entrada, texto)
}

async function salvar() {
  await userEvent.click(screen.getByRole("button", { name: "Salvar" }))
}

describe("FormObra: abertura (RNF-04.01)", () => {
  it("nova obra: o foco vai ao título do formulário e a situação começa em Planejada", () => {
    renderizar()

    const titulo = screen.getByRole("heading", { name: "Nova obra" })
    expect(titulo).toHaveFocus()
    expect(screen.getByRole("radio", { name: "Planejada" })).toBeChecked()
    expect(screen.getByRole("form", { name: "Nova obra" })).toBeVisible()
  })

  it("editar: o título é Editar obra e os campos vêm com os dados da obra, em pt-BR", () => {
    renderizar({
      obra: montarObra({
        titulo: "DEMO - Praça",
        situacao: "em_andamento",
        categoria: "praca_lazer",
        secretaria: "Infraestrutura",
        descricao: "Texto",
        dataInicio: "2026-12-01",
        dataPrevista: "2027-03-31",
        valorPrevistoCentavos: 25_000_000,
        localizacao: PONTO_CENTRO,
        estadoLocalizacao: "dentro-de-bairro",
        bairroId: "uv-10",
      }),
    })

    expect(screen.getByRole("heading", { name: "Editar obra" })).toHaveFocus()
    expect(campo("Título")).toHaveValue("DEMO - Praça")
    expect(screen.getByRole("radio", { name: "Em andamento" })).toBeChecked()
    expect(campo("Secretaria")).toHaveValue("Infraestrutura")
    expect(campo("Descrição")).toHaveValue("Texto")
    expect(campo("Data de início")).toHaveValue("2026-12-01")
    expect(campo("Data prevista")).toHaveValue("2027-03-31")
    expect(campo("Valor previsto (R$)")).toHaveValue("250.000,00")
    expect(within(grupoLocalizacao()).getByRole("status")).toHaveTextContent(
      "Bairro calculado: Centro"
    )
  })
})

describe("FormObra: localização (TU-10, CA-04.04, CA-04.05, CA-04.06)", () => {
  it("o clique no mapa preenche latitude e longitude, mostra o bairro e avisa o ponto provisório", () => {
    const { controle, onPontoProvisorioChange } = renderizar()

    act(() => controle.current?.definirPonto(PONTO_CENTRO))

    expect(campo("Latitude")).toHaveValue(
      PONTO_CENTRO.latitude.toLocaleString("pt-BR", {
        maximumFractionDigits: 6,
      })
    )
    expect(campo("Longitude")).not.toHaveValue("")
    expect(within(grupoLocalizacao()).getByRole("status")).toHaveTextContent(
      "Bairro calculado: Centro"
    )
    expect(onPontoProvisorioChange).toHaveBeenLastCalledWith(PONTO_CENTRO)
  })

  it("digitar as coordenadas mostra o bairro antes de salvar e avisa o ponto, aceitando vírgula ou ponto", async () => {
    const { onPontoProvisorioChange } = renderizar()

    await digitar("Latitude", String(PONTO_CENTRO.latitude).replace(".", ","))
    expect(onPontoProvisorioChange).toHaveBeenLastCalledWith(null)
    await digitar("Longitude", String(PONTO_CENTRO.longitude))

    expect(within(grupoLocalizacao()).getByRole("status")).toHaveTextContent(
      "Bairro calculado: Centro"
    )
    expect(onPontoProvisorioChange).toHaveBeenLastCalledWith(PONTO_CENTRO)
  })

  it("ponto dentro do município e fora dos bairros mostra fora da cobertura dos bairros e deixa salvar", async () => {
    const { controle } = renderizar()

    act(() => controle.current?.definirPonto(PONTO_FORA_DA_COBERTURA))

    expect(within(grupoLocalizacao()).getByRole("status")).toHaveTextContent(
      "Bairro calculado: Fora da cobertura dos bairros"
    )
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled()
  })

  it("ponto fora do município mostra o erro no grupo Localização, bloqueia o envio e não chama o servidor", async () => {
    const { controle } = renderizar()
    await digitar("Título", "DEMO - Obra fora")

    act(() => controle.current?.definirPonto(PONTO_FORA_DO_LIMITE))

    expect(
      within(grupoLocalizacao()).getByText(
        "O ponto está fora do município de Acaraú"
      )
    ).toBeVisible()
    expect(within(grupoLocalizacao()).queryByRole("status")).toBeNull()
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled()
    expect(obrasClient.criar).not.toHaveBeenCalled()
  })

  it("remover a localização limpa os campos, tira a prévia e o ponto provisório", async () => {
    const { controle, onPontoProvisorioChange } = renderizar()
    act(() => controle.current?.definirPonto(PONTO_CENTRO))

    await userEvent.click(
      within(grupoLocalizacao()).getByRole("button", {
        name: "Remover localização",
      })
    )

    expect(campo("Latitude")).toHaveValue("")
    expect(campo("Longitude")).toHaveValue("")
    expect(within(grupoLocalizacao()).queryByRole("status")).toBeNull()
    expect(
      screen.queryByRole("button", { name: "Remover localização" })
    ).toBeNull()
    expect(onPontoProvisorioChange).toHaveBeenLastCalledWith(null)
  })

  it("só a latitude: o erro aparece na longitude, junto ao campo, e nada é enviado", async () => {
    renderizar()
    await digitar("Título", "DEMO - Só latitude")
    await digitar("Latitude", "-2,88")

    await salvar()

    expect(
      await within(grupoLocalizacao()).findByText("Informe também a longitude.")
    ).toBeVisible()
    expect(campo("Longitude")).toHaveAttribute("aria-invalid", "true")
    expect(obrasClient.criar).not.toHaveBeenCalled()
  })

  it("corrigir só um lado limpa o erro do irmão e o envio volta a funcionar", async () => {
    jest.mocked(obrasClient.criar).mockResolvedValue(montarObra())
    renderizar()
    await digitar("Título", "DEMO - Só latitude")
    await digitar("Latitude", "-2,88")
    await salvar()
    await within(grupoLocalizacao()).findByText("Informe também a longitude.")

    await userEvent.clear(campo("Latitude"))
    await salvar()

    await waitFor(() => expect(obrasClient.criar).toHaveBeenCalledTimes(1))
    expect(within(grupoLocalizacao()).queryByRole("alert")).toBeNull()
  })
})

describe("FormObra: validação (CA-04.08)", () => {
  it("título vazio, data prevista antes do início e valor negativo: cada erro junto ao campo, nada enviado", async () => {
    renderizar()
    await digitar("Data de início", "2026-12-02")
    await digitar("Data prevista", "2026-12-01")
    await digitar("Valor previsto (R$)", "-1")

    await salvar()

    const doCampo = (rotulo: string) =>
      campo(rotulo).closest('[data-slot="field"]') as HTMLElement
    expect(
      await within(doCampo("Título")).findByText(
        "O título deve ter pelo menos 3 caracteres."
      )
    ).toBeVisible()
    expect(
      within(doCampo("Data prevista")).getByText(
        "A data prevista não pode ser anterior à data de início."
      )
    ).toBeVisible()
    expect(
      within(doCampo("Valor previsto (R$)")).getByText(
        "O valor previsto não pode ser negativo."
      )
    ).toBeVisible()
    expect(obrasClient.criar).not.toHaveBeenCalled()
  })

  it("corrigir a data de início limpa o erro da data prevista", async () => {
    jest.mocked(obrasClient.criar).mockResolvedValue(montarObra())
    renderizar()
    await digitar("Título", "DEMO - Datas")
    await digitar("Data de início", "2026-12-02")
    await digitar("Data prevista", "2026-12-01")
    await salvar()
    expect(
      await screen.findByText(
        "A data prevista não pode ser anterior à data de início."
      )
    ).toBeVisible()

    await digitar("Data de início", "2026-11-30")

    await waitFor(() =>
      expect(
        screen.queryByText(
          "A data prevista não pode ser anterior à data de início."
        )
      ).toBeNull()
    )
    await salvar()
    await waitFor(() => expect(obrasClient.criar).toHaveBeenCalledTimes(1))
  })
})

describe("FormObra: salvar", () => {
  it("cria com o mesmo corpo da rota (valor em centavos, ponto com 6 casas) e avisa quem abriu", async () => {
    const salva = montarObra({ id: "11111111-1111-4111-8111-111111111111" })
    jest.mocked(obrasClient.criar).mockResolvedValue(salva)
    const { controle, onSalvo } = renderizar()
    await digitar("Título", "DEMO - Praça nova")
    await userEvent.click(screen.getByRole("radio", { name: "Concluída" }))
    await digitar("Valor previsto (R$)", "250.000,00")
    act(() => controle.current?.definirPonto(PONTO_CENTRO))

    await salvar()

    await waitFor(() => expect(onSalvo).toHaveBeenCalledTimes(1))
    expect(onSalvo.mock.calls[0]![0]).toEqual(salva)
    expect(obrasClient.criar).toHaveBeenCalledWith({
      titulo: "DEMO - Praça nova",
      situacao: "concluida",
      descricao: null,
      categoria: null,
      secretaria: null,
      dataInicio: null,
      dataPrevista: null,
      valorPrevistoCentavos: 25_000_000,
      localizacao: PONTO_CENTRO,
    })
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("sem localização também salva, com localizacao null", async () => {
    jest.mocked(obrasClient.criar).mockResolvedValue(montarObra())
    renderizar()
    await digitar("Título", "DEMO - Sem ponto")

    await salvar()

    await waitFor(() => expect(obrasClient.criar).toHaveBeenCalledTimes(1))
    expect(jest.mocked(obrasClient.criar).mock.calls[0]![0]).toMatchObject({
      localizacao: null,
    })
  })

  it("editar chama o PUT com o id da obra", async () => {
    const obra = montarObra({ id: "22222222-2222-4222-8222-222222222222" })
    jest.mocked(obrasClient.editar).mockResolvedValue(obra)
    renderizar({ obra })

    await salvar()

    await waitFor(() => expect(obrasClient.editar).toHaveBeenCalledTimes(1))
    expect(jest.mocked(obrasClient.editar).mock.calls[0]![0]).toBe(obra.id)
    expect(obrasClient.criar).not.toHaveBeenCalled()
  })

  it("escolher a categoria grava o valor do catálogo e 'sem categoria' volta a null", async () => {
    jest.mocked(obrasClient.criar).mockResolvedValue(montarObra())
    renderizar()
    await digitar("Título", "DEMO - Categoria")

    await userEvent.click(screen.getByRole("combobox", { name: "Categoria" }))
    await userEvent.click(
      await screen.findByRole("option", { name: "Drenagem" })
    )
    await salvar()

    await waitFor(() => expect(obrasClient.criar).toHaveBeenCalledTimes(1))
    expect(jest.mocked(obrasClient.criar).mock.calls[0]![0]).toMatchObject({
      categoria: "drenagem",
    })
  })

  it("cancelar chama onCancelar sem enviar nada", async () => {
    const { onCancelar } = renderizar()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(onCancelar).toHaveBeenCalledTimes(1)
    expect(obrasClient.criar).not.toHaveBeenCalled()
  })
})

describe("FormObra: erros do servidor (TU-11, CA-04.21, RF-04.24)", () => {
  async function preencherEEnviar() {
    await digitar("Título", "DEMO - Obra do teste")
    await digitar("Secretaria", "Infraestrutura")
    await salvar()
  }

  it("VALIDACAO: a mensagem aparece no campo certo, o localizacao no grupo, e o digitado fica", async () => {
    jest.mocked(obrasClient.criar).mockRejectedValue(
      new ApiError("VALIDACAO", "Os dados enviados são inválidos.", {
        status: 400,
        details: {
          campos: {
            titulo: "Título recusado pelo servidor.",
            valorPrevistoCentavos: "Valor recusado pelo servidor.",
            localizacao: "Ponto recusado pelo servidor.",
          },
        },
      })
    )
    renderizar()

    await preencherEEnviar()

    const doCampo = (rotulo: string) =>
      campo(rotulo).closest('[data-slot="field"]') as HTMLElement
    expect(
      await within(doCampo("Título")).findByText(
        "Título recusado pelo servidor."
      )
    ).toBeVisible()
    expect(
      within(doCampo("Valor previsto (R$)")).getByText(
        "Valor recusado pelo servidor."
      )
    ).toBeVisible()
    expect(
      within(grupoLocalizacao()).getByText("Ponto recusado pelo servidor.")
    ).toBeVisible()
    expect(campo("Título")).toHaveValue("DEMO - Obra do teste")
    expect(campo("Secretaria")).toHaveValue("Infraestrutura")
    expect(screen.queryByText("Os dados enviados são inválidos.")).toBeNull()
  })

  it("NAO_AUTENTICADO: aviso de sessão expirada com o link de login e o digitado mantido", async () => {
    jest.mocked(obrasClient.criar).mockRejectedValue(
      new ApiError("NAO_AUTENTICADO", "Entre para acessar esta área.", {
        status: 401,
      })
    )
    renderizar()

    await preencherEEnviar()

    expect(
      await screen.findByText(
        /Sua sessão expirou. Entre novamente para salvar./
      )
    ).toBeVisible()
    expect(
      screen.getByRole("link", { name: "Entrar novamente" })
    ).toHaveAttribute("href", "/entrar?motivo=expirada&retorno=%2Fobras")
    expect(campo("Título")).toHaveValue("DEMO - Obra do teste")
    expect(screen.queryByText("Entre para acessar esta área.")).toBeNull()
  })

  it("ERRO_INTERNO: aviso recuperável com a mensagem do envelope, sem detalhe técnico, e o digitado mantido", async () => {
    jest
      .mocked(obrasClient.criar)
      .mockRejectedValue(
        new ApiError(
          "ERRO_INTERNO",
          "Ocorreu um erro inesperado. Tente novamente em instantes.",
          { status: 500 }
        )
      )
    renderizar()

    await preencherEEnviar()

    expect(
      await screen.findByText(
        "Ocorreu um erro inesperado. Tente novamente em instantes."
      )
    ).toBeVisible()
    expect(campo("Título")).toHaveValue("DEMO - Obra do teste")
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled()
  })

  it("sem conexão: mostra a mensagem de rede e deixa tentar de novo", async () => {
    jest
      .mocked(obrasClient.criar)
      .mockRejectedValue(
        new ApiError("SEM_CONEXAO", "Não foi possível falar com o servidor.")
      )
    renderizar()

    await preencherEEnviar()

    expect(
      await screen.findByText("Não foi possível falar com o servidor.")
    ).toBeVisible()
  })

  it("o aviso some na próxima tentativa que dá certo", async () => {
    jest
      .mocked(obrasClient.criar)
      .mockRejectedValueOnce(
        new ApiError("ERRO_INTERNO", "Falhou.", { status: 500 })
      )
      .mockResolvedValueOnce(montarObra())
    renderizar()
    await preencherEEnviar()
    await screen.findByText("Falhou.")

    await salvar()

    await waitFor(() => expect(screen.queryByText("Falhou.")).toBeNull())
    expect(obrasClient.criar).toHaveBeenCalledTimes(2)
  })
})
