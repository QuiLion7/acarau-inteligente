"use client"

import { useMemo, useReducer } from "react"
import { toast } from "sonner"

import {
  ESTADO_INICIAL,
  PASSOS_DO_ASSISTENTE,
  reduzirAssistente,
  type PassoAssistente,
} from "@/components/importacao/estado-assistente"
import { IndicadorPassos } from "@/components/importacao/indicador-passos"
import { PassoBairros } from "@/components/importacao/passo-bairros"
import { PassoConfirmar } from "@/components/importacao/passo-confirmar"
import { PassoColunas } from "@/components/importacao/passo-colunas"
import { PassoEnvio } from "@/components/importacao/passo-envio"
import { PassoValidacao } from "@/components/importacao/passo-validacao"
import { useConteudoImportado } from "@/hooks/query/use-importacao"
import {
  analisarImportacao,
  ehConfirmavel,
} from "@/lib/importacao/analisar-importacao"
import { calcularHashConteudo } from "@/lib/importacao/hash-conteudo"
import { lerArquivoCsv } from "@/lib/importacao/ler-arquivo-csv"
import { TAMANHO_MAXIMO_BYTES } from "@/lib/importacao/limites"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"

const MENSAGEM_FALHA_DE_LEITURA =
  "Não foi possível ler o arquivo escolhido. Tente de novo ou escolha outro."

// Assistente de importação (RF-02.01): o estado é o que o analista escolheu; a leitura e a análise são derivadas
// dele com `useMemo` sobre o motor puro, então cada troca de separador, coluna ou decisão reanalisa na hora
// (DEC-T-01). Nada é enviado ao servidor aqui e cancelar só descarta o estado.
export function AssistenteImportacao({
  bairros,
}: {
  bairros: readonly BairroResumo[]
}) {
  const [estado, despachar] = useReducer(reduzirAssistente, ESTADO_INICIAL)
  const { entrada, separador, mapeamento, decisoes } = estado

  const leitura = useMemo(
    () => (entrada ? lerArquivoCsv({ ...entrada, separador }) : null),
    [entrada, separador]
  )
  const arquivo = leitura?.status === "lido" ? leitura.arquivo : null
  const consulta = useConteudoImportado(
    arquivo ? (entrada?.hash ?? null) : null
  )
  const jaImportado = consulta.data?.importado ? consulta.data : null
  const analise = useMemo(
    () =>
      arquivo
        ? analisarImportacao({ arquivo, mapeamento, decisoes, bairros })
        : null,
    [arquivo, mapeamento, decisoes, bairros]
  )

  const confirmavel = analise && ehConfirmavel(analise) ? analise : null

  async function handleEscolherArquivo(file: File) {
    try {
      // Um byte além do limite basta para o motor recusar por tamanho, sem carregar um arquivo gigante na memória.
      const recorte = file.slice(0, TAMANHO_MAXIMO_BYTES + 1)
      const bytes = new Uint8Array(await recorte.arrayBuffer())
      const hash = await calcularHashConteudo(bytes)
      despachar({
        tipo: "arquivo-escolhido",
        entrada: { nome: file.name, bytes, hash },
      })
    } catch {
      toast.error(MENSAGEM_FALHA_DE_LEITURA)
    }
  }

  const irPara = (passo: PassoAssistente) =>
    despachar({ tipo: "passo-alterado", passo })
  const cancelar = () => despachar({ tipo: "cancelado" })

  // Arquivo recusado mostra o motivo no próprio envio: não há colunas para configurar.
  const recusa = leitura?.status === "recusado" ? leitura : null
  // Conteúdo já importado trava o assistente nas colunas, onde o aviso aparece (CA-02.14).
  const passo: PassoAssistente = recusa
    ? "envio"
    : jaImportado
      ? "colunas"
      : estado.passo
  const focar = estado.interagiu

  return (
    <div className="flex flex-col gap-6">
      <IndicadorPassos passos={PASSOS_DO_ASSISTENTE} atual={passo} />
      <div key={passo}>
        {passo === "envio" ? (
          <PassoEnvio
            recusa={recusa}
            focar={focar}
            onEscolher={handleEscolherArquivo}
          />
        ) : null}
        {passo === "colunas" && arquivo && analise ? (
          <PassoColunas
            arquivo={arquivo}
            analise={analise}
            focar={focar}
            jaImportado={jaImportado}
            onTrocarSeparador={(novo) =>
              despachar({ tipo: "separador-trocado", separador: novo })
            }
            onMapear={(novo) =>
              despachar({ tipo: "mapeamento-alterado", mapeamento: novo })
            }
            onContinuar={() => irPara("bairros")}
            onCancelar={cancelar}
          />
        ) : null}
        {passo === "bairros" && analise ? (
          <PassoBairros
            analise={analise}
            bairros={bairros}
            focar={focar}
            onDecidir={(decisao) =>
              despachar({ tipo: "decisao-registrada", decisao })
            }
            onVoltar={() => irPara("colunas")}
            onContinuar={() => irPara("validacao")}
            onCancelar={cancelar}
          />
        ) : null}
        {passo === "validacao" && analise ? (
          <PassoValidacao
            analise={analise}
            focar={focar}
            onVoltar={() => irPara("bairros")}
            onContinuar={() => irPara("confirmar")}
            onCancelar={cancelar}
          />
        ) : null}
        {passo === "confirmar" && entrada && arquivo && confirmavel ? (
          <PassoConfirmar
            entrada={entrada}
            arquivo={arquivo}
            analise={confirmavel}
            decisoes={decisoes}
            focar={focar}
            onVoltar={() => irPara("validacao")}
            onCancelar={cancelar}
          />
        ) : null}
      </div>
    </div>
  )
}
