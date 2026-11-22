import { readFileSync } from "node:fs"

import pg from "pg"

import { BANCO_E2E, urlDoBanco } from "../../scripts/url-banco.mjs"

// O servidor do E2E lê o `acarau_e2e`; o `.env` já foi carregado pelo `playwright.config.ts`. Serve ao caso de "nenhum
// dataset" (E2E-10), que a API não produz: o reset sempre recarrega o de exemplo.
export async function esvaziarDatasets(): Promise<void> {
  const cliente = new pg.Client({ connectionString: urlDoBanco(BANCO_E2E) })
  await cliente.connect()
  try {
    await cliente.query("delete from dataset")
  } finally {
    await cliente.end()
  }
}

const SITUACOES = ["planejada", "em_andamento", "concluida", "suspensa"]

type BairroDoArtefato = { id: string; pontoInterior: [number, number] }
const BAIRROS_DO_ARTEFATO: BairroDoArtefato[] = JSON.parse(
  readFileSync("dados/gerados/territorio.json", "utf8")
).bairros

// Troca todas as obras por `total` obras sintéticas dentro dos bairros, para o E2E de volume (RNF-04.05): a API não
// aceita mais que o teto (200) nem cria tantas obras com a rapidez que o teste precisa. O reset do próximo spec
// devolve as de exemplo (DV-32).
export async function inserirObras(total: number): Promise<void> {
  const cliente = new pg.Client({ connectionString: urlDoBanco(BANCO_E2E) })
  await cliente.connect()
  try {
    await cliente.query("delete from obra")
    for (let indice = 0; indice < total; indice++) {
      const bairro = BAIRROS_DO_ARTEFATO[indice % BAIRROS_DO_ARTEFATO.length]!
      const [longitude, latitude] = bairro.pontoInterior
      const situacao = SITUACOES[indice % SITUACOES.length]
      const { rows } = await cliente.query<{ id: string }>(
        `insert into obra (titulo, situacao, longitude, latitude, estado_localizacao, bairro_id, criado_por, atualizado_por)
         values ($1, $2, $3, $4, 'dentro-de-bairro', $5, 'e2e', 'e2e') returning id`,
        [
          `DEMO - Obra de volume ${indice + 1}`,
          situacao,
          longitude,
          latitude,
          bairro.id,
        ]
      )
      // Toda obra tem ao menos a entrada inicial do histórico (contrato `Obra`).
      await cliente.query(
        `insert into obra_historico (obra_id, situacao_anterior, situacao_nova, autor_nome)
         values ($1, null, $2, 'Carga do E2E')`,
        [rows[0]!.id, situacao]
      )
    }
  } finally {
    await cliente.end()
  }
}
