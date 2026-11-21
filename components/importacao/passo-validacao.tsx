import { AcoesDoPasso } from "@/components/importacao/acoes-do-passo"
import { TituloDoPasso } from "@/components/importacao/titulo-do-passo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  MENSAGEM_DO_PROBLEMA,
  rotuloDasLinhas,
} from "@/lib/importacao/mensagens"
import type {
  AnaliseImportacao,
  ProblemaLinha,
} from "@/lib/importacao/tipos-importacao"
import { flexionar } from "@/lib/territorio/formato"

const PROBLEMAS_VISIVEIS = 100

type PassoValidacaoProps = {
  analise: AnaliseImportacao
  focar: boolean
  onVoltar: () => void
  onContinuar: () => void
  onCancelar: () => void
}

function ItemDoResumo({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex flex-col rounded-lg border px-3 py-2">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-lg font-semibold tabular-nums">
        {valor.toLocaleString("pt-BR")}
      </dd>
    </div>
  )
}

function ListaDeProblemas({
  problemas,
}: {
  problemas: readonly ProblemaLinha[]
}) {
  const visiveis = problemas.slice(0, PROBLEMAS_VISIVEIS)
  return (
    <section aria-labelledby="titulo-problemas" className="flex flex-col gap-2">
      <h3 id="titulo-problemas" className="text-lg font-semibold">
        Problemas por linha
      </h3>
      <ul className="flex flex-col gap-1.5">
        {visiveis.map(({ linhas, codigo, severidade }) => (
          <li key={`${codigo}-${linhas[0]}`} className="text-sm">
            <span className="font-medium">
              {severidade === "erro" ? "Erro" : "Aviso"}
            </span>
            {" - "}
            {rotuloDasLinhas(linhas)}: {MENSAGEM_DO_PROBLEMA[codigo]}
          </li>
        ))}
      </ul>
      {problemas.length > visiveis.length ? (
        <p className="text-sm text-muted-foreground">
          Mostrando os primeiros {PROBLEMAS_VISIVEIS} de {problemas.length}{" "}
          problemas.
        </p>
      ) : null}
    </section>
  )
}

// Passo 4 (RF-02.13 a RF-02.18): resumo e problemas por linha, sem repetir o conteúdo bruto das células. Erro
// bloqueia, aviso não (RN-02.05): só uma análise sem erro segue para a confirmação.
export function PassoValidacao({
  analise,
  focar,
  onVoltar,
  onContinuar,
  onCancelar,
}: PassoValidacaoProps) {
  const { resumo, problemas, podeConfirmar } = analise

  return (
    <div className="flex flex-col gap-6">
      <TituloDoPasso focar={focar}>Validação</TituloDoPasso>
      <dl
        aria-label="Resumo da validação"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        <ItemDoResumo rotulo="Linhas lidas" valor={resumo.lidas} />
        <ItemDoResumo rotulo="Linhas válidas" valor={resumo.validas} />
        <ItemDoResumo rotulo="Com aviso" valor={resumo.comAviso} />
        <ItemDoResumo rotulo="Com erro" valor={resumo.comErro} />
        <ItemDoResumo rotulo="Sem dado" valor={resumo.semDado} />
        <ItemDoResumo
          rotulo="Fora da cobertura"
          valor={resumo.foraDaCobertura}
        />
      </dl>

      <Alert
        variant={podeConfirmar ? "default" : "destructive"}
        role={podeConfirmar ? "status" : "alert"}
      >
        <AlertDescription>
          {podeConfirmar
            ? `Validação sem erros${resumo.comAviso > 0 ? `, com ${flexionar(resumo.comAviso, "aviso", "avisos")}` : ""}. O arquivo está pronto para ser confirmado.`
            : "Há erros que bloqueiam a importação. Corrija o arquivo e envie de novo, ou volte para ajustar as colunas e os bairros."}
        </AlertDescription>
      </Alert>

      {problemas.length > 0 ? <ListaDeProblemas problemas={problemas} /> : null}

      <AcoesDoPasso
        onVoltar={onVoltar}
        onContinuar={onContinuar}
        podeContinuar={podeConfirmar}
        onCancelar={onCancelar}
      />
    </div>
  )
}
