import {
  buscarConta,
  contasDoAmbiente,
  normalizarUsuario,
} from "@/lib/auth/contas-demo"
import { lerAmbiente } from "@/lib/config/ambiente"

const HASH_ANALISTA = "scrypt:16384:8:1:c2FsLWE:aGFzaC1h"
const HASH_ADMIN = "scrypt:16384:8:1:c2FsLWI:aGFzaC1i"

const ambiente = lerAmbiente({
  DATABASE_URL: "postgres://u:p@localhost:5432/b",
  APP_URL: "http://localhost:3000",
  DEMO_ANALISTA_USUARIO: "Analista",
  DEMO_ANALISTA_NOME: "Analista Demo",
  DEMO_ANALISTA_SENHA_HASH: HASH_ANALISTA,
  DEMO_ADMIN_USUARIO: "admin",
  DEMO_ADMIN_NOME: "Administrador Demo",
  DEMO_ADMIN_SENHA_HASH: HASH_ADMIN,
})

describe("contasDoAmbiente", () => {
  it("monta analista e administrador com usuário normalizado e o papel de cada conta", () => {
    expect(contasDoAmbiente(ambiente)).toEqual([
      {
        usuario: "analista",
        nome: "Analista Demo",
        papel: "analista",
        senhaHash: HASH_ANALISTA,
      },
      {
        usuario: "admin",
        nome: "Administrador Demo",
        papel: "administrador",
        senhaHash: HASH_ADMIN,
      },
    ])
  })
})

describe("buscarConta", () => {
  it.each(["analista", "  ANALISTA ", "Analista"])(
    "acha a conta do analista por %j",
    (digitado) => {
      expect(buscarConta(digitado, ambiente)?.papel).toBe("analista")
    }
  )

  it("devolve undefined para usuário que não é conta de demo", () => {
    expect(buscarConta("outro", ambiente)).toBeUndefined()
  })
})

describe("normalizarUsuario", () => {
  it("tira espaços das pontas e põe em minúsculas", () => {
    expect(normalizarUsuario("  Admin ")).toBe("admin")
  })
})
