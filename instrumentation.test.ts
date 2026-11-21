import { onRequestError } from "@/instrumentation"
import { garantirPreCarregadoRegistrando } from "@/lib/server/demo/dataset-pre-carregado"

// O banco e a carga do dataset de exemplo têm testes próprios: aqui só importa quando a subida os aciona.
jest.mock("@/lib/server/db/cliente", () => ({
  obterBanco: jest.fn(() => ({})),
}))
jest.mock("@/lib/server/demo/dataset-pre-carregado", () => ({
  garantirPreCarregadoRegistrando: jest.fn(),
}))

const contextoDeRender = {
  routerKind: "App Router",
  routePath: "/saude",
  routeType: "render",
  renderSource: "react-server-components",
  revalidateReason: undefined,
  renderType: "dynamic",
} as const

const ambienteValido = {
  DATABASE_URL: "postgres://u:p@localhost:5432/banco",
  APP_URL: "http://localhost:3000",
  DEMO_ANALISTA_USUARIO: "analista",
  DEMO_ANALISTA_NOME: "Analista Demo",
  DEMO_ANALISTA_SENHA_HASH: "scrypt:16384:8:1:c2Fs:aGFzaA",
  DEMO_ADMIN_USUARIO: "admin",
  DEMO_ADMIN_NOME: "Administrador Demo",
  DEMO_ADMIN_SENHA_HASH: "scrypt:16384:8:1:c2Fs:aGFzaA",
}

// Registro de módulos novo a cada chamada: o lerAmbiente memoriza o ambiente válido.
async function registrarIsolado(): Promise<void> {
  await jest.isolateModulesAsync(async () => {
    const { register } = await import("@/instrumentation")
    await register()
  })
}

function linhasEscritas(escrita: jest.SpyInstance): Record<string, unknown>[] {
  return escrita.mock.calls.map(([linha]) => JSON.parse(String(linha)))
}

describe("instrumentation", () => {
  const ambienteOriginal = process.env
  const ambienteBase = { NODE_ENV: "test" } as const
  let escrita: jest.SpyInstance
  let sair: jest.SpyInstance

  beforeEach(() => {
    jest.mocked(garantirPreCarregadoRegistrando).mockClear()
    // Ambiente do zero: o .env do desenvolvedor (carregado pelo next/jest) não pode vazar para o teste.
    process.env = { ...ambienteBase, NEXT_RUNTIME: "nodejs" }
    escrita = jest.spyOn(process.stdout, "write").mockImplementation(() => true)
    sair = jest
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never)
  })

  afterEach(() => {
    process.env = ambienteOriginal
  })

  describe("register", () => {
    it("registra config.invalida só com os nomes e encerra com código 1 quando falta variável obrigatória", async () => {
      process.env.DATABASE_URL = "postgres://u:senha-secreta@localhost/banco"
      delete process.env.APP_URL

      await registrarIsolado()

      expect(sair).toHaveBeenCalledWith(1)
      expect(garantirPreCarregadoRegistrando).not.toHaveBeenCalled()
      const [linha] = linhasEscritas(escrita)
      expect(linha).toMatchObject({ nivel: "error", evento: "config.invalida" })
      expect(linha.variaveis).toEqual(
        expect.arrayContaining(["APP_URL", "DEMO_ANALISTA_SENHA_HASH"])
      )
      expect(JSON.stringify(linha)).not.toContain("senha-secreta")
    })

    it("não valida durante o build (a imagem Docker não tem ambiente)", async () => {
      process.env.NEXT_PHASE = "phase-production-build"

      await registrarIsolado()

      expect(sair).not.toHaveBeenCalled()
      expect(escrita).not.toHaveBeenCalled()
      expect(garantirPreCarregadoRegistrando).not.toHaveBeenCalled()
    })

    it("não valida fora do runtime nodejs", async () => {
      process.env.NEXT_RUNTIME = "edge"

      await registrarIsolado()

      expect(sair).not.toHaveBeenCalled()
      expect(escrita).not.toHaveBeenCalled()
    })

    it("sobe sem encerrar nem registrar nada quando o ambiente está válido, e garante o dataset de exemplo (RF-02.41)", async () => {
      Object.assign(process.env, ambienteValido)

      await registrarIsolado()

      expect(sair).not.toHaveBeenCalled()
      expect(escrita).not.toHaveBeenCalled()
      expect(garantirPreCarregadoRegistrando).toHaveBeenCalledTimes(1)
    })
  })

  describe("onRequestError", () => {
    it("registra render.erro com requestId, rota e digest", async () => {
      const erro = Object.assign(new Error("quebrou ao renderizar"), {
        digest: "d-123",
      })

      await onRequestError(
        erro,
        { path: "/saude", method: "GET", headers: { "x-request-id": "req-9" } },
        contextoDeRender
      )

      expect(linhasEscritas(escrita)[0]).toMatchObject({
        nivel: "error",
        evento: "render.erro",
        requestId: "req-9",
        rota: "/saude",
        digest: "d-123",
        erro: { nome: "Error", mensagem: "quebrou ao renderizar" },
      })
    })

    it("aceita erro que não é Error e cabeçalho ausente", async () => {
      await onRequestError(
        "texto solto",
        { path: "/", method: "GET", headers: {} },
        contextoDeRender
      )

      const [linha] = linhasEscritas(escrita)
      expect(linha).toMatchObject({
        evento: "render.erro",
        erro: "texto solto",
      })
      expect(linha).not.toHaveProperty("requestId")
      expect(linha).not.toHaveProperty("digest")
    })

    it("usa o primeiro valor quando o cabeçalho vem repetido", async () => {
      await onRequestError(
        new Error("x"),
        { path: "/", method: "GET", headers: { "x-request-id": ["a", "b"] } },
        contextoDeRender
      )

      expect(linhasEscritas(escrita)[0]).toMatchObject({ requestId: "a" })
    })
  })
})
