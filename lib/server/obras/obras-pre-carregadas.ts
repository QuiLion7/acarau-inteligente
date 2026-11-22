import "server-only"

import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { z } from "zod"

import { localizarObra } from "@/lib/obras/localizacao-obra"
import type { Executor } from "@/lib/server/db/cliente"
import { obra, obraHistorico } from "@/lib/server/db/schema"
import { log } from "@/lib/server/log"
import { obterDadosTerritorio } from "@/lib/server/territorio/territorio-repositorio"
import {
  entradaHistoricoSchema,
  obraEntradaSchema,
} from "@/lib/validations/obra-schema"

// O JSON vive no repositório e o `Dockerfile` o copia para o runtime; o caminho parte do diretório de execução, que
// no container é a raiz do standalone (mesmo caso do CSV da Saúde).
export const CAMINHO_DAS_OBRAS_PRE_CARREGADAS = join(
  "dados",
  "sinteticos",
  "obras-pre-carregadas_DEMO.json"
)

const AUTOR_DA_CARGA = "sistema"

const obraPreCarregadaSchema = z.strictObject({
  codigoExemplo: z.string().regex(/^DEMO-\d{2}$/),
  entrada: obraEntradaSchema,
  atualizadoEm: z.iso.datetime(),
  historico: z.array(entradaHistoricoSchema).min(1),
})
const obrasPreCarregadasSchema = z.array(obraPreCarregadaSchema).min(1)

type ObraPreCarregada = z.infer<typeof obraPreCarregadaSchema>

async function lerObrasDeExemplo(): Promise<ObraPreCarregada[]> {
  const texto = await readFile(
    join(process.cwd(), CAMINHO_DAS_OBRAS_PRE_CARREGADAS),
    "utf-8"
  )
  // O arquivo inteiro é validado antes de gravar qualquer linha: um item inválido falha a carga toda.
  return obrasPreCarregadasSchema.parse(JSON.parse(texto))
}

// O estado e o bairro vêm de `localizarObra`, como numa obra criada pelo analista (DV-41): o JSON não os traz.
function linhaDaObra(item: ObraPreCarregada) {
  const territorio = obterDadosTerritorio()
  const { entrada } = item
  const localizacao = localizarObra(entrada.localizacao, {
    limite: territorio.limite.geometria.coordinates,
    bairros: territorio.bairros,
  })
  if (localizacao.estado === "fora-do-limite") {
    throw new Error(`Obra ${item.codigoExemplo} está fora do município.`)
  }
  return {
    codigoExemplo: item.codigoExemplo,
    titulo: entrada.titulo,
    descricao: entrada.descricao,
    categoria: entrada.categoria,
    secretaria: entrada.secretaria,
    situacao: entrada.situacao,
    dataInicio: entrada.dataInicio,
    dataPrevista: entrada.dataPrevista,
    valorPrevistoCentavos: entrada.valorPrevistoCentavos,
    longitude: entrada.localizacao?.longitude ?? null,
    latitude: entrada.localizacao?.latitude ?? null,
    estadoLocalizacao: localizacao.estado,
    bairroId:
      localizacao.estado === "dentro-de-bairro" ? localizacao.bairroId : null,
    criadoPor: AUTOR_DA_CARGA,
    criadoEm: new Date(item.historico[0].registradoEm),
    atualizadoPor: AUTOR_DA_CARGA,
    atualizadoEm: new Date(item.atualizadoEm),
  }
}

/**
 * Garante as obras de exemplo (RF-04.29, RF-04.30): insere as que faltam pelo `codigo_exemplo` com `on conflict do
 * nothing`, então a subida e o reset podem chamá-la sempre, inclusive em corrida (a segunda instância espera a
 * primeira confirmar e não insere nada). As datas são fixas no JSON, para o reset devolver exatamente o mesmo estado
 * (CA-04.18). Uma obra de exemplo apagada ou editada por fora volta a faltar só se o código sumir.
 */
export async function garantirObrasPreCarregadas(
  banco: Executor
): Promise<"criadas" | "existentes"> {
  const itens = await lerObrasDeExemplo()
  return banco.transaction(async (transacao) => {
    const linhas = itens.map(linhaDaObra)
    const criadas = await transacao
      .insert(obra)
      .values(linhas)
      .onConflictDoNothing({ target: obra.codigoExemplo })
      .returning({ id: obra.id, codigoExemplo: obra.codigoExemplo })
    const idPorCodigo = new Map(
      criadas.map(({ id, codigoExemplo }) => [codigoExemplo, id])
    )
    const historico = itens.flatMap(({ codigoExemplo, historico }) => {
      const obraId = idPorCodigo.get(codigoExemplo)
      return obraId === undefined
        ? []
        : historico.map((entrada) => ({
            obraId,
            situacaoAnterior: entrada.situacaoAnterior,
            situacaoNova: entrada.situacaoNova,
            autorNome: entrada.autorNome,
            registradoEm: new Date(entrada.registradoEm),
          }))
    })
    if (historico.length > 0) {
      await transacao.insert(obraHistorico).values(historico)
    }
    return criadas.length > 0 ? "criadas" : "existentes"
  })
}

/** Registra o resultado da carga (TechSpec §10): quem chama decide se uma falha derruba algo; aqui só se registra. */
export async function garantirObrasPreCarregadasRegistrando(
  banco: Executor
): Promise<void> {
  try {
    const resultado = await garantirObrasPreCarregadas(banco)
    log.info("demo.obras_pre_carregadas", { resultado })
  } catch (erro) {
    log.error("demo.obras_pre_carregadas", { erro })
  }
}
