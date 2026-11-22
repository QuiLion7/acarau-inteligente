import { SecaoEducacaoPrevia } from "@/components/relatorios/secao-educacao-previa"
import { SecaoFontesPrevia } from "@/components/relatorios/secao-fontes-previa"
import { SecaoObrasPrevia } from "@/components/relatorios/secao-obras-previa"
import { SecaoSaudePrevia } from "@/components/relatorios/secao-saude-previa"
import { SecaoTerritorioPrevia } from "@/components/relatorios/secao-territorio-previa"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import type {
  FiltrosDoRelatorio,
  RelatorioDados,
} from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.cabecalho

function textoDoBairro(filtros: FiltrosDoRelatorio): string {
  return filtros.bairro?.nome ?? TEXTOS_RELATORIOS.todosOsBairros
}

function textoDoPeriodo(filtros: FiltrosDoRelatorio): string {
  const { periodo } = filtros
  if (periodo === null) return TEXTOS_RELATORIOS.semPeriodo
  if (periodo.tipo === "sem-dados") return periodo.valor
  return periodo.tipo === "padrao"
    ? TEXTOS_RELATORIOS.periodoMaisRecente(periodo.periodo)
    : periodo.periodo
}

// Prévia HTML do relatório (RF-05.03, DEC-T-03): o mesmo `RelatorioDados` do PDF, na mesma ordem (cabeçalho,
// Território, Saúde, Educação, Obras, Fontes), com os mesmos números e sem nenhum cálculo novo. Texto vindo de dados
// (título de obra, nome de escola) entra como texto do React, nunca como HTML (RNF-05.04).
export function PreviaRelatorio({ dados }: { dados: RelatorioDados }) {
  const { filtros } = dados
  const itens: [string, string][] = [
    [TEXTOS.geradoEm, TEXTOS_RELATORIOS.geradoAoClicar],
    [TEXTOS.bairro, textoDoBairro(filtros)],
    [TEXTOS.periodo, textoDoPeriodo(filtros)],
    [TEXTOS.universo, dados.universo],
    [TEXTOS.geradoPor, dados.autor],
    [TEXTOS.versaoApp, dados.versaoApp],
  ]
  return (
    <article
      aria-labelledby="previa-titulo"
      className="flex flex-col gap-8 rounded-2xl border p-4 sm:p-6"
    >
      <header className="flex flex-col gap-3">
        <h2
          id="previa-titulo"
          className="text-2xl font-semibold tracking-tight"
        >
          {TEXTOS_RELATORIOS.titulo}
        </h2>
        <Alert>
          <AlertDescription>
            {TEXTOS_RELATORIOS.avisoDemonstracao}
          </AlertDescription>
        </Alert>
        {dados.versaoPrivada ? (
          <Alert>
            <AlertDescription>
              {TEXTOS_RELATORIOS.versaoNaoPublicada}
            </AlertDescription>
          </Alert>
        ) : null}
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          {itens.map(([rotulo, valor]) => (
            <div key={rotulo} className="contents">
              <dt className="font-medium">{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </header>
      <SecaoTerritorioPrevia
        territorio={dados.territorio}
        bairro={filtros.bairro}
      />
      <SecaoSaudePrevia
        saude={dados.saude}
        territorio={dados.territorio}
        filtros={filtros}
        versaoPrivada={dados.versaoPrivada}
      />
      <SecaoEducacaoPrevia educacao={dados.educacao} bairro={filtros.bairro} />
      <SecaoObrasPrevia obras={dados.obras} />
      <SecaoFontesPrevia fontes={dados.fontes} />
    </article>
  )
}
