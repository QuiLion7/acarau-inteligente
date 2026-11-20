import { origemPermitida } from "@/lib/server/http/origem"

const APP_URL = "http://localhost:3000"

function requisicao(metodo: string, origem?: string): Request {
  return new Request(`${APP_URL}/api/algo`, {
    method: metodo,
    headers: origem ? { origin: origem } : {},
  })
}

describe("origemPermitida", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "aceita %s com Origin igual à origem de APP_URL",
    (metodo) => {
      expect(origemPermitida(requisicao(metodo, APP_URL), APP_URL)).toBe(true)
    }
  )

  it("aceita a escrita quando APP_URL tem caminho ou barra final", () => {
    expect(
      origemPermitida(requisicao("POST", APP_URL), `${APP_URL}/inicio/`)
    ).toBe(true)
  })

  it("recusa escrita sem Origin", () => {
    expect(origemPermitida(requisicao("POST"), APP_URL)).toBe(false)
  })

  it.each([
    ["outro host", "https://exemplo.com"],
    ["outra porta", "http://localhost:3001"],
    ["outro esquema", "https://localhost:3000"],
    ["subdomínio parecido", "http://localhost:3000.exemplo.com"],
    ["origem nula", "null"],
  ])("recusa escrita com Origin de %s", (_descricao, origem) => {
    expect(origemPermitida(requisicao("POST", origem), APP_URL)).toBe(false)
  })

  it.each(["GET", "HEAD", "OPTIONS"])(
    "ignora a origem em %s, mesmo ausente ou de outro host",
    (metodo) => {
      expect(origemPermitida(requisicao(metodo), APP_URL)).toBe(true)
      expect(
        origemPermitida(requisicao(metodo, "https://exemplo.com"), APP_URL)
      ).toBe(true)
    }
  )
})
