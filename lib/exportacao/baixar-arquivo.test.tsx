import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"

describe("baixarBlob (RF-05.04)", () => {
  it("clica num link com o nome do arquivo e o objeto URL, e remove o link do documento", () => {
    const blob = new Blob(["conteudo"], { type: "text/csv" })
    const cliques: { href: string; download: string }[] = []
    jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        cliques.push({ href: this.href, download: this.download })
        // O link existe no documento durante o clique (Firefox exige isso).
        expect(document.body.contains(this)).toBe(true)
      })
    const url = {
      createObjectURL: jest.fn(() => "blob:http://localhost/abc"),
      revokeObjectURL: jest.fn(),
    }

    baixarBlob(blob, "acarau-inteligente_obras_2026-11-22.csv", {
      url,
      agendar: () => undefined,
    })

    expect(url.createObjectURL).toHaveBeenCalledWith(blob)
    expect(cliques).toEqual([
      {
        href: "blob:http://localhost/abc",
        download: "acarau-inteligente_obras_2026-11-22.csv",
      },
    ])
    expect(document.querySelector("a[download]")).toBeNull()
  })

  it("revoga o objeto URL só depois do prazo, não na hora do clique", () => {
    jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined)
    const url = {
      createObjectURL: jest.fn(() => "blob:http://localhost/xyz"),
      revokeObjectURL: jest.fn(),
    }
    let agendada: (() => void) | undefined
    let prazo = 0

    baixarBlob(new Blob(["x"]), "a.png", {
      url,
      agendar: (tarefa, depoisDeMs) => {
        agendada = tarefa
        prazo = depoisDeMs
      },
    })

    expect(url.revokeObjectURL).not.toHaveBeenCalled()
    expect(prazo).toBeGreaterThanOrEqual(1_000)
    agendada?.()
    expect(url.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/xyz"
    )
  })

  it("usa o relógio e o URL reais por padrão e revoga depois do prazo", () => {
    jest.useFakeTimers()
    jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined)
    URL.createObjectURL = jest.fn(() => "blob:http://localhost/real")
    URL.revokeObjectURL = jest.fn()

    baixarBlob(new Blob(["x"]), "a.pdf")
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    jest.runAllTimers()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:http://localhost/real"
    )
    jest.useRealTimers()
  })
})
