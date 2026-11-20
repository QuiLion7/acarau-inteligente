// Carga do território (TechSpec EP-01 §2, §3): lê o GeoPackage e os CSVs de `dados/`, valida tudo
// e grava `dados/gerados/{territorio,camadas}.json` só se tudo conferir.
// Uso: npm run dados:territorio [-- --conferir] [--insumos <pasta>] [--saida <pasta>]
import { createHash } from "node:crypto"
import {
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { DatabaseSync } from "node:sqlite"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import type {
  ArtefatoCamadas,
  ArtefatoTerritorio,
} from "../lib/territorio/artefato-schema"
import type {
  InsumosTerritorio,
  LinhaEscolaCsv,
  LinhaRelatorioBairro,
  RegistroBairroGpkg,
  RegistroEscolaGpkg,
  RegistroLimiteGpkg,
} from "../lib/territorio/insumos-carga"
import { lerCsv } from "../lib/territorio/ler-csv"
import { montarTerritorio } from "../lib/territorio/montar-territorio"

const ARQUIVO_GPKG = "acarau_completo.gpkg"
const ARQUIVO_RELATORIO = "relatorio_validacao_bairros.csv"
const ARQUIVO_ESCOLAS = "escolas_origem_tratada.csv"
const TABELA_BAIRROS = "bairros_acarau_validados"
const TABELA_LIMITE = "limite_acarau"
const TABELA_ESCOLAS = "escolas_acarau"
const TAMANHO_VERSAO = 12

function calcularVersao(arquivo: string): string {
  return createHash("sha256")
    .update(readFileSync(arquivo))
    .digest("hex")
    .slice(0, TAMANHO_VERSAO)
}

function numeroObrigatorio(texto: string, coluna: string, uv: string): number {
  const numero = Number(texto)
  if (texto.trim() === "" || !Number.isFinite(numero)) {
    throw new Error(
      `${ARQUIVO_RELATORIO}: valor inválido em "${coluna}" da UV ${uv}: "${texto}"`
    )
  }
  return numero
}

function lerRelatorio(arquivo: string): LinhaRelatorioBairro[] {
  return lerCsv(readFileSync(arquivo, "utf8")).map((linha) => ({
    uv: numeroObrigatorio(linha.uv, "uv", linha.uv),
    area_calc_m2: numeroObrigatorio(
      linha.area_calc_m2,
      "area_calc_m2",
      linha.uv
    ),
    area_lei_m2:
      linha.area_lei_m2 === ""
        ? null
        : numeroObrigatorio(linha.area_lei_m2, "area_lei_m2", linha.uv),
    inicio_pdf: numeroObrigatorio(linha.inicio_pdf, "inicio_pdf", linha.uv),
  }))
}

function booleanoObrigatorio(texto: string, inep: string): boolean {
  if (texto === "True") return true
  if (texto === "False") return false
  throw new Error(
    `${ARQUIVO_ESCOLAS}: valor inválido em "coordenadas_validas" do INEP ${inep}: "${texto}"`
  )
}

function lerEscolasCsv(arquivo: string): LinhaEscolaCsv[] {
  return lerCsv(readFileSync(arquivo, "utf8")).map((linha) => ({
    codigoInep: linha["Código INEP"],
    nome: linha["Escola"],
    endereco: linha["Endereço"],
    dependencia: linha["Dependência Administrativa"],
    localizacao: linha["Localização"],
    situacaoAtendimento: linha["Restrição de Atendimento"],
    coordenadasValidas: booleanoObrigatorio(
      linha["coordenadas_validas"],
      linha["Código INEP"]
    ),
  }))
}

function lerSrs(banco: DatabaseSync, tabela: string): number {
  const linha = banco
    .prepare("SELECT srs_id FROM gpkg_geometry_columns WHERE table_name = ?")
    .get(tabela)
  if (typeof linha?.srs_id !== "number") {
    throw new Error(
      `${ARQUIVO_GPKG}: tabela "${tabela}" sem SRC em gpkg_geometry_columns`
    )
  }
  return linha.srs_id
}

function lerInsumos(pastaInsumos: string): InsumosTerritorio {
  const gpkg = join(pastaInsumos, ARQUIVO_GPKG)
  const relatorio = join(pastaInsumos, ARQUIVO_RELATORIO)
  const escolasCsv = join(pastaInsumos, ARQUIVO_ESCOLAS)
  const banco = new DatabaseSync(gpkg, { readOnly: true })
  try {
    return {
      // O driver devolve as linhas sem tipo: o contrato dos campos é conferido na validação da carga.
      bairros: banco
        .prepare(
          `SELECT fid, uv, bairro, lei, pg_pdf, status, geom FROM ${TABELA_BAIRROS} ORDER BY fid`
        )
        .all() as RegistroBairroGpkg[],
      limite: banco
        .prepare(
          `SELECT Municipio, codigo_ibg, geom FROM ${TABELA_LIMITE} ORDER BY fid`
        )
        .all() as RegistroLimiteGpkg[],
      escolasGpkg: banco
        .prepare(`SELECT cod_inep, geom FROM ${TABELA_ESCOLAS} ORDER BY fid`)
        .all() as RegistroEscolaGpkg[],
      escolasCsv: lerEscolasCsv(escolasCsv),
      relatorio: lerRelatorio(relatorio),
      srs: {
        bairros: lerSrs(banco, TABELA_BAIRROS),
        limite: lerSrs(banco, TABELA_LIMITE),
        escolas: lerSrs(banco, TABELA_ESCOLAS),
      },
      versoes: {
        gpkg: calcularVersao(gpkg),
        relatorio: calcularVersao(relatorio),
        csvEscolas: calcularVersao(escolasCsv),
      },
    }
  } finally {
    banco.close()
  }
}

type Artefatos = { territorio: ArtefatoTerritorio; camadas: ArtefatoCamadas }

function serializar({
  territorio,
  camadas,
}: Artefatos): Record<string, string> {
  return {
    "territorio.json": `${JSON.stringify(territorio)}\n`,
    "camadas.json": `${JSON.stringify(camadas)}\n`,
  }
}

function resumir(
  { territorio, camadas }: Artefatos,
  versoes: InsumosTerritorio["versoes"]
): string[] {
  const { qualidade } = territorio
  return [
    `Bairros: ${territorio.bairros.length}`,
    `Limite municipal: 1`,
    `Escolas com localização: ${qualidade.comLocalizacao} · sem localização: ${qualidade.semLocalizacao}`,
    `Escolas dentro de bairros: ${qualidade.dentroDeBairros} · fora da cobertura: ${qualidade.foraDaCobertura} (fora do limite: ${qualidade.foraDoLimite})`,
    `Casos de fronteira: ${territorio.casosFronteira.length}`,
    `Camadas: ${camadas.camadas.map((camada) => camada.id).join(", ")}`,
    `Versões: GeoPackage ${versoes.gpkg} · relatório ${versoes.relatorio} · catálogo de escolas ${versoes.csvEscolas}`,
  ]
}

function gravar(conteudos: Record<string, string>, pastaSaida: string) {
  const temporarios = Object.entries(conteudos).map(([nome, conteudo]) => {
    const temporario = join(pastaSaida, `${nome}.tmp`)
    writeFileSync(temporario, conteudo)
    return { temporario, destino: join(pastaSaida, nome) }
  })
  try {
    for (const { temporario, destino } of temporarios)
      renameSync(temporario, destino)
  } finally {
    for (const { temporario } of temporarios)
      rmSync(temporario, { force: true })
  }
}

function conferirContraVersionado(
  conteudos: Record<string, string>,
  pastaSaida: string
): string[] {
  return Object.entries(conteudos).flatMap(([nome, conteudo]) => {
    const arquivo = join(pastaSaida, nome)
    if (!existsSync(arquivo)) return [`${nome}: arquivo versionado não existe`]
    return readFileSync(arquivo, "utf8") === conteudo
      ? []
      : [`${nome}: difere do que a carga gera`]
  })
}

function executar(argumentos: string[]): number {
  const { values } = parseArgs({
    args: argumentos,
    options: {
      conferir: { type: "boolean", default: false },
      insumos: { type: "string", default: "dados" },
      saida: { type: "string", default: join("dados", "gerados") },
    },
  })
  const [pastaInsumos, pastaSaida] = [
    resolve(values.insumos),
    resolve(values.saida),
  ]
  const insumos = lerInsumos(pastaInsumos)
  const resultado = montarTerritorio(insumos)
  if (!resultado.ok) {
    console.error("Carga do território reprovada; nada foi gravado:")
    for (const falha of resultado.falhas)
      console.error(`- ${falha.regra}: ${falha.mensagem}`)
    return 1
  }
  for (const linha of resumir(resultado, insumos.versoes)) console.log(linha)
  const conteudos = serializar(resultado)
  if (values.conferir) {
    const divergencias = conferirContraVersionado(conteudos, pastaSaida)
    for (const divergencia of divergencias) console.error(`- ${divergencia}`)
    if (divergencias.length > 0) {
      console.error(
        "Artefatos versionados desatualizados: rode `npm run dados:territorio`."
      )
      return 1
    }
    console.log("Artefatos versionados conferem com os insumos.")
    return 0
  }
  gravar(conteudos, pastaSaida)
  console.log(`Gravado em ${pastaSaida}.`)
  return 0
}

try {
  process.exitCode = executar(process.argv.slice(2))
} catch (erro) {
  console.error(
    `Falha na carga do território: ${erro instanceof Error ? erro.message : erro}`
  )
  process.exitCode = 1
}
