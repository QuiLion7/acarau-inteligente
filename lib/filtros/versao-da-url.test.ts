import { lerVersaoDaUrl } from "@/lib/filtros/versao-da-url"

const UUID = "6f1c2d3e-4a5b-4c6d-8e7f-9a0b1c2d3e4f"

describe("lerVersaoDaUrl (RF-02.28)", () => {
  it("devolve o uuid válido, ou o primeiro quando o parâmetro vem repetido", () => {
    expect(lerVersaoDaUrl({ versao: UUID })).toBe(UUID)
    expect(lerVersaoDaUrl({ versao: [UUID, "outro"] })).toBe(UUID)
  })

  it.each([undefined, "", "abc", "<script>", "6f1c2d3e-4a5b"])(
    "trata %p como ausente",
    (versao) => {
      expect(lerVersaoDaUrl({ versao })).toBeNull()
    }
  )

  it("sem o parâmetro devolve null", () => {
    expect(lerVersaoDaUrl({})).toBeNull()
  })
})
