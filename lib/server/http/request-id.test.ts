import { obterRequestId } from "@/lib/server/http/request-id"

const UUID = "6f1c2a9e-3b7d-4c11-9a0e-2d5b8f7c4e10"

describe("obterRequestId", () => {
  it("propaga o UUID recebido no header", () => {
    expect(obterRequestId(new Headers({ "x-request-id": UUID }))).toBe(UUID)
  })

  it.each([[""], ["abc"], ["não-é-uuid"], [`${UUID}x`]])(
    "gera um UUID novo para o valor %j",
    (valor) => {
      const id = obterRequestId(new Headers({ "x-request-id": valor }))

      expect(id).not.toBe(valor)
      expect(id).toMatch(/^[0-9a-f-]{36}$/)
    }
  )

  it("gera um UUID novo quando o header não existe", () => {
    expect(obterRequestId(new Headers())).toMatch(/^[0-9a-f-]{36}$/)
  })
})
