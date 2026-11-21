import { createHash } from "node:crypto"

import { calcularHashConteudo } from "@/lib/importacao/hash-conteudo"

describe("calcularHashConteudo", () => {
  it("devolve o mesmo SHA-256 hexadecimal que o servidor calcula com o node:crypto", async () => {
    const bytes = new TextEncoder().encode("bairro;ano;casos\nCentro;2025;42\n")

    const hash = await calcularHashConteudo(bytes)

    expect(hash).toBe(createHash("sha256").update(bytes).digest("hex"))
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it("bytes diferentes dão hashes diferentes", async () => {
    const a = await calcularHashConteudo(new Uint8Array([1, 2, 3]))
    const b = await calcularHashConteudo(new Uint8Array([1, 2, 4]))

    expect(a).not.toBe(b)
  })

  it("sem crypto.subtle devolve null, sem lançar", async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "crypto")
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    })

    try {
      expect(await calcularHashConteudo(new Uint8Array([1]))).toBeNull()
    } finally {
      if (original) Object.defineProperty(globalThis, "crypto", original)
    }
  })
})
