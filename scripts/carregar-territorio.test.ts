import { execFile } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { promisify } from "node:util"

const executar = promisify(execFile)
const RAIZ = process.cwd()
const SCRIPT = join(RAIZ, "scripts", "carregar-territorio.ts")
const TEMPO_LIMITE_MS = 60_000

type Saida = { codigo: number; stdout: string; stderr: string }

async function rodarCarga(argumentos: string[]): Promise<Saida> {
  try {
    const { stdout, stderr } = await executar(
      process.execPath,
      ["--import", "tsx", SCRIPT, ...argumentos],
      { cwd: RAIZ }
    )
    return { codigo: 0, stdout, stderr }
  } catch (erro) {
    const falha = erro as { code: number; stdout: string; stderr: string }
    return { codigo: falha.code, stdout: falha.stdout, stderr: falha.stderr }
  }
}

describe("carregar-territorio", () => {
  const pastas: string[] = []
  const novaPasta = () => {
    const pasta = mkdtempSync(join(tmpdir(), "carga-territorio-"))
    pastas.push(pasta)
    return pasta
  }

  afterEach(() => {
    for (const pasta of pastas.splice(0))
      rmSync(pasta, { recursive: true, force: true })
  })

  function copiarInsumos(pasta: string) {
    for (const arquivo of [
      "acarau_completo.gpkg",
      "relatorio_validacao_bairros.csv",
      "escolas_origem_tratada.csv",
    ]) {
      copyFileSync(join(RAIZ, "dados", arquivo), join(pasta, arquivo))
    }
  }

  it(
    "--conferir sai 0 com o versionado e mostra 24 bairros e 1 limite",
    async () => {
      const saida = await rodarCarga(["--conferir"])

      expect(saida.codigo).toBe(0)
      expect(saida.stdout).toContain("Bairros: 24")
      expect(saida.stdout).toContain("Limite municipal: 1")
      expect(saida.stdout).toContain(
        "Escolas com localização: 58 · sem localização: 4"
      )
      expect(saida.stdout).toContain("conferem com os insumos")
    },
    TEMPO_LIMITE_MS
  )

  it(
    "grava os dois artefatos de forma idêntica ao versionado, sem deixar temporário",
    async () => {
      const pastaSaida = novaPasta()

      const saida = await rodarCarga(["--saida", pastaSaida])

      expect(saida.codigo).toBe(0)
      expect(readdirSync(pastaSaida).toSorted()).toEqual([
        "camadas.json",
        "territorio.json",
      ])
      for (const nome of ["camadas.json", "territorio.json"]) {
        expect(readFileSync(join(pastaSaida, nome), "utf8")).toBe(
          readFileSync(join(RAIZ, "dados", "gerados", nome), "utf8")
        )
      }
    },
    TEMPO_LIMITE_MS
  )

  it(
    "--conferir sai 1 e aponta o arquivo quando o versionado diverge",
    async () => {
      const pastaVazia = novaPasta()

      const saida = await rodarCarga(["--conferir", "--saida", pastaVazia])

      expect(saida.codigo).toBe(1)
      expect(saida.stderr).toContain(
        "territorio.json: arquivo versionado não existe"
      )
    },
    TEMPO_LIMITE_MS
  )

  it(
    "insumo adulterado (uma UV a menos) falha com uma linha por regra e não grava nada",
    async () => {
      const pastaInsumos = novaPasta()
      const pastaSaida = novaPasta()
      copiarInsumos(pastaInsumos)
      const banco = new DatabaseSync(join(pastaInsumos, "acarau_completo.gpkg"))
      banco.exec("PRAGMA foreign_keys = OFF")
      banco.exec(
        "DROP TRIGGER IF EXISTS rtree_bairros_acarau_validados_geom_delete"
      )
      banco.prepare("DELETE FROM bairros_acarau_validados WHERE uv = 24").run()
      banco.close()

      const saida = await rodarCarga([
        "--insumos",
        pastaInsumos,
        "--saida",
        pastaSaida,
      ])

      expect(saida.codigo).toBe(1)
      expect(saida.stderr).toContain("nada foi gravado")
      expect(saida.stderr).toContain(
        "UV_QUANTIDADE: esperadas 24 UVs, encontradas 23"
      )
      expect(readdirSync(pastaSaida)).toEqual([])
      expect(existsSync(join(pastaSaida, "territorio.json"))).toBe(false)
    },
    TEMPO_LIMITE_MS
  )

  it(
    "catálogo adulterado (INEP repetido e 5 sem coordenada) falha sem gravar",
    async () => {
      const pastaInsumos = novaPasta()
      const pastaSaida = novaPasta()
      copiarInsumos(pastaInsumos)
      const arquivoCsv = join(pastaInsumos, "escolas_origem_tratada.csv")
      const [cabecalho, primeira, segunda, ...resto] = readFileSync(
        arquivoCsv,
        "utf8"
      ).split("\n")
      const primeiraSemCoordenada = primeira.replace(/True$/, "False")
      const segundaComInepRepetido = segunda.replace("23000066", "23000040")
      writeFileSync(
        arquivoCsv,
        [
          cabecalho,
          primeiraSemCoordenada,
          segundaComInepRepetido,
          ...resto,
        ].join("\n")
      )

      const saida = await rodarCarga([
        "--insumos",
        pastaInsumos,
        "--saida",
        pastaSaida,
      ])

      expect(saida.codigo).toBe(1)
      expect(saida.stderr).toContain("SEM_COORDENADA_QUANTIDADE")
      expect(saida.stderr).toContain("INEP_DUPLICADO")
      expect(readdirSync(pastaSaida)).toEqual([])
    },
    TEMPO_LIMITE_MS
  )

  it(
    "sai 1 com mensagem quando o insumo não existe",
    async () => {
      const saida = await rodarCarga(["--insumos", novaPasta()])

      expect(saida.codigo).toBe(1)
      expect(saida.stderr).toContain("Falha na carga do território")
    },
    TEMPO_LIMITE_MS
  )
})
