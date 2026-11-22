import { render, screen, within } from "@testing-library/react"

import { PreviaRelatorio } from "@/components/relatorios/previa-relatorio"
import { ANALISE_SAUDE } from "@/test/saude-fixtures"
import { montarObra } from "@/lib/obras/__fixtures__/obra"
import { relatorioDeTeste } from "@/test/relatorio-fixtures"

function secao(nome: string) {
  return screen.getByRole("region", { name: nome })
}

describe("PreviaRelatorio: estrutura (TU-15, CA-05.01, CA-05.03)", () => {
  it("mostra o título, o aviso de demonstração e o cabeçalho com filtros, universo, autor e versão", () => {
    render(
      <PreviaRelatorio dados={relatorioDeTeste({ autor: "Analista Demo" })} />
    )

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Relatório territorial - Acaraú Inteligente (Demonstração Independente)",
      })
    ).toBeVisible()
    expect(
      screen.getByText(/não constitui sistema oficial da Prefeitura de Acaraú/)
    ).toBeVisible()
    const cabecalho =
      screen.getByRole("banner", { hidden: true }) ?? document.body
    expect(cabecalho).toBeDefined()
    expect(screen.getByText("gerado ao clicar em Gerar PDF")).toBeVisible()
    expect(screen.getByText("Todos os bairros")).toBeVisible()
    expect(screen.getByText("2026 (mais recente)")).toBeVisible()
    expect(
      screen.getByText("24 bairros da sede; não cobre o município inteiro")
    ).toBeVisible()
    expect(screen.getByText("Analista Demo")).toBeVisible()
    expect(screen.getByText("0.5.0+a1b2c3d")).toBeVisible()
  })

  it("mostra as cinco seções na ordem: Território, Saúde, Educação, Obras, Fontes e limitações", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste()} />)

    const titulos = screen
      .getAllByRole("heading", { level: 3 })
      .map((titulo) => titulo.textContent)
    expect(titulos).toEqual([
      "Território",
      "Saúde",
      "Educação",
      "Obras",
      "Fontes e limitações",
    ])
  })

  it("o território tem o mapa dos 24 bairros com nome acessível, a fonte da geometria e o aviso de reconstrução", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste({ bairroId: "uv-10" })} />)

    const territorio = secao("Território")
    const mapa = within(territorio).getByRole("img", {
      name: "Mapa dos 24 bairros da sede",
    })
    expect(mapa.querySelectorAll("path")).toHaveLength(24)
    expect(
      within(territorio).getByText(
        /Bairro em destaque \(contorno grosso\): Centro/
      )
    ).toBeVisible()
    expect(
      within(territorio).getByText(/Lei Municipal 2.172\/2026, art. 8º, I/)
    ).toBeVisible()
    expect(
      within(territorio).getByText(
        /Reconstrução técnica da Lei Municipal 2.172\/2026/
      )
    ).toBeVisible()
  })
})

describe("PreviaRelatorio: Saúde (RF-05.10, RF-05.11, CA-05.04, CA-05.05)", () => {
  it("mostra DADOS SINTÉTICOS, o dataset, o total, a legenda, o ranking e a tabela com os mesmos valores da tela", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste()} />)

    const saude = secao("Saúde")
    expect(within(saude).getByText("DADOS SINTÉTICOS")).toBeVisible()
    expect(within(saude).getByText("Roteiro 2025-2026")).toBeVisible()
    expect(within(saude).getByText("Publicada")).toBeVisible()
    const total = within(saude).getByRole("group", { name: "Total do período" })
    expect(within(total).getByText("51 casos")).toBeVisible()
    expect(
      within(total).getByText("Soma dos 2 bairros com dados no período.")
    ).toBeVisible()
    const ranking = within(saude)
      .getByRole("heading", { name: "Ranking dos bairros" })
      .closest("section")!
    expect(
      within(ranking)
        .getAllByRole("listitem")
        .map((li) => li.textContent)
    ).toEqual(["Centro: 51 casos", "Outra Banda: 0 casos"])
    const tabela = within(saude).getByRole("table", {
      name: "Casos por bairro",
    })
    expect(within(tabela).getAllByRole("row")).toHaveLength(25)
    expect(
      within(tabela).getByRole("row", { name: /Rodagem.*Sem dados/ })
    ).toBeVisible()
    const legenda = within(saude).getByRole("list", { name: "Legenda do mapa" })
    expect(within(legenda).getByText("Zero informado (0 casos)")).toBeVisible()
    expect(within(legenda).getByText("Sem dados")).toBeVisible()
    expect(
      within(legenda).getByText("Método: quantis (até 5 classes).")
    ).toBeVisible()
  })

  it("sem dataset visível diz 'sem dados' e não mostra nenhum card nem número no lugar", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste({ analise: null })} />)

    const saude = secao("Saúde")
    expect(
      within(saude).getByText("Sem dados: nenhum dataset de saúde disponível.")
    ).toBeVisible()
    expect(within(saude).queryByRole("group")).toBeNull()
    expect(within(saude).queryByRole("table")).toBeNull()
    expect(within(saude).queryByRole("img")).toBeNull()
  })

  it("período que o dataset não tem diz 'período sem dados' com o dataset identificado", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste({ periodo: "1999" })} />)

    const saude = secao("Saúde")
    expect(
      within(saude).getByText(
        "Período sem dados: o dataset não tem o período 1999."
      )
    ).toBeVisible()
    expect(within(saude).getByText("Roteiro 2025-2026")).toBeVisible()
    expect(within(saude).queryByRole("table")).toBeNull()
  })

  it("bairro sem dado no período diz isso e o cartão do bairro não mostra zero", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste({ bairroId: "uv-13" })} />)

    const saude = secao("Saúde")
    expect(within(saude).getByText("Bairro sem dado no período.")).toBeVisible()
    const cartao = within(saude).getByRole("group", {
      name: /Bairro selecionado: Rodagem/,
    })
    expect(within(cartao).getByText("Sem dados")).toBeVisible()
    expect(within(cartao).getByText("Fora do ranking")).toBeVisible()
  })

  it("mostra o aviso de versão não publicada no cabeçalho e na Saúde, e não o mostra para versão publicada", () => {
    const privada = {
      ...ANALISE_SAUDE,
      versao: {
        ...ANALISE_SAUDE.versao,
        situacao: "privado" as const,
        publicadoEm: null,
      },
    }
    const { unmount } = render(
      <PreviaRelatorio dados={relatorioDeTeste({ analise: privada })} />
    )

    expect(
      screen.getAllByText("Versão não publicada - uso interno")
    ).toHaveLength(2)
    expect(within(secao("Saúde")).getByText("Não publicada")).toBeVisible()
    unmount()

    render(<PreviaRelatorio dados={relatorioDeTeste()} />)
    expect(screen.queryByText("Versão não publicada - uso interno")).toBeNull()
  })

  it("mostra o gráfico por período só com mais de um período e cita a lacuna, que não é zero", () => {
    const comLacuna = {
      ...ANALISE_SAUDE,
      periodos: ["2025", "2026", "2027"],
      valores: { "uv-10": { "2025": 9, "2027": 4 } },
    }
    const { unmount } = render(
      <PreviaRelatorio dados={relatorioDeTeste({ analise: comLacuna })} />
    )

    expect(
      within(secao("Saúde")).getByRole("img", { name: "Casos por período" })
    ).toBeVisible()
    expect(
      within(secao("Saúde")).getByText(
        "Sem valor em 2026 (lacuna, não é zero)."
      )
    ).toBeVisible()
    unmount()

    const umPeriodo = { ...ANALISE_SAUDE, periodos: ["2026"] }
    render(<PreviaRelatorio dados={relatorioDeTeste({ analise: umPeriodo })} />)
    expect(
      within(secao("Saúde")).queryByRole("img", { name: "Casos por período" })
    ).toBeNull()
  })
})

describe("PreviaRelatorio: Educação, Obras e Fontes (RF-05.12 a RF-05.14, CA-05.04)", () => {
  it("a Educação mostra os cinco números do artefato, a tabela por bairro e as pendências", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste()} />)

    const educacao = secao("Educação")
    const georreferenciadas = within(educacao).getByRole("group", {
      name: /georreferenciados na base disponível/,
    })
    expect(within(georreferenciadas).getByText("58")).toBeVisible()
    expect(
      within(
        within(educacao).getByRole("group", {
          name: "Fora da cobertura dos bairros",
        })
      ).getByText("33")
    ).toBeVisible()
    expect(
      within(educacao).getByRole("table", {
        name: /Número de escolas dentro de cada bairro/,
      })
    ).toBeVisible()
    expect(
      within(educacao).getByText(/Fora da cobertura dos bairros: 33 escolas\./)
    ).toBeVisible()
    expect(
      within(educacao).getByText("Sem localização (não aparecem no mapa)")
    ).toBeVisible()
    expect(
      within(educacao).getByText(/Fonte: .*Data de referência: Não informada\./)
    ).toBeVisible()
  })

  it("com um bairro filtrado a Educação lista as escolas dele", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste({ bairroId: "uv-10" })} />)

    expect(
      within(secao("Educação")).getByRole("heading", {
        name: "Escolas em Centro",
      })
    ).toBeVisible()
  })

  it("sem a camada de escolas a Educação diz 'fonte ausente' e não mostra os números", () => {
    render(
      <PreviaRelatorio
        dados={relatorioDeTeste({ comCamadaDeEscolas: false })}
      />
    )

    const educacao = secao("Educação")
    expect(
      within(educacao).getByText(/Fonte da camada de escolas ausente/)
    ).toBeVisible()
    expect(within(educacao).queryByRole("group")).toBeNull()
    expect(within(educacao).queryByRole("table")).toBeNull()
  })

  it("Obras mostra SINTETICO, o resumo por situação, o bairro pelo nome e o aviso de valor previsto", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste()} />)

    const obras = secao("Obras")
    expect(within(obras).getByText("DADOS SINTÉTICOS")).toBeVisible()
    const resumo = within(obras)
      .getByRole("heading", { name: "Resumo das obras" })
      .closest("section")!
    expect(
      within(resumo).getByText("Planejada").nextElementSibling
    ).toHaveTextContent("1")
    expect(
      within(resumo).getByText("Em andamento").nextElementSibling
    ).toHaveTextContent("1")
    expect(
      within(resumo).getByText("Concluída").nextElementSibling
    ).toHaveTextContent("0")
    expect(
      within(resumo).getByText("Total de obras").nextElementSibling
    ).toHaveTextContent("2")
    const linha = within(obras).getByRole("row", { name: /Praça no Centro/ })
    expect(within(linha).getByText("Centro")).toBeVisible()
    expect(within(linha).getByText("15/03/2027")).toBeVisible()
    expect(within(linha).getByText("SINTETICO")).toBeVisible()
    expect(
      within(obras).getByText("Valor previsto - não é valor pago")
    ).toBeVisible()
    expect(
      within(obras).getByRole("row", { name: /Área de lazer/ })
    ).toHaveTextContent("Sem localização")
  })

  it("título de obra com HTML aparece como texto literal, nunca como elemento (RNF-05.04)", () => {
    const perigosa = montarObra({
      id: "x",
      titulo: "<b>DEMO</b> <img src=x onerror=alert(1)>",
    })
    const { container } = render(
      <PreviaRelatorio dados={relatorioDeTeste({ obras: [perigosa] })} />
    )

    expect(
      screen.getByText("<b>DEMO</b> <img src=x onerror=alert(1)>")
    ).toBeVisible()
    expect(container.querySelector("b")).toBeNull()
    expect(container.querySelector("img")).toBeNull()
  })

  it("Obras sem nenhuma obra no filtro diz isso e não mostra aviso de valor nem tabela", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste({ obras: [] })} />)

    const obras = secao("Obras")
    expect(
      within(obras).getByText("Nenhuma obra com este filtro.")
    ).toBeVisible()
    expect(within(obras).queryByRole("table")).toBeNull()
    expect(
      within(obras).queryByText("Valor previsto - não é valor pago")
    ).toBeNull()
  })

  it("Fontes lista as camadas com proveniência, o dataset publicado, as obras e a atribuição do OpenStreetMap", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste()} />)

    const fontes = secao("Fontes e limitações")
    expect(
      within(fontes).getByRole("list", { name: "Camadas carregadas" })
    ).toBeVisible()
    expect(within(fontes).getAllByText("OFICIAL_FONTE").length).toBeGreaterThan(
      0
    )
    expect(within(fontes).getByText("DERIVADO_VALIDAR")).toBeVisible()
    expect(within(fontes).getByText("COLABORATIVO")).toBeVisible()
    expect(
      within(fontes).getByText(/Roteiro 2025-2026 \(versão 1\), publicado em/)
    ).toBeVisible()
    expect(
      within(fontes).getByText(/2 obras sintéticas; última atualização em/)
    ).toBeVisible()
    expect(
      within(fontes).getByText(/© OpenStreetMap contributors/)
    ).toBeVisible()
  })

  it("sem dataset publicado Fontes diz que não há", () => {
    render(<PreviaRelatorio dados={relatorioDeTeste({ analise: null })} />)

    expect(
      within(secao("Fontes e limitações")).getByText(
        "Nenhum dataset publicado."
      )
    ).toBeVisible()
  })
})
