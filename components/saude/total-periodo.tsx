import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import type { AnalisePeriodo } from "@/lib/saude/analise-periodo"
import { flexionar } from "@/lib/territorio/formato"

const formatadorDeNumero = new Intl.NumberFormat("pt-BR")

type TotalPeriodoProps = Pick<AnalisePeriodo, "total" | "foraDaCobertura">

function textoDoForaDaCobertura({
  casos,
  localidades,
}: AnalisePeriodo["foraDaCobertura"]): string {
  if (localidades === 0) return "Fora da cobertura: nenhum registro no período."
  return `Fora da cobertura: ${flexionar(casos, "caso", "casos")} em ${flexionar(localidades, "localidade", "localidades")}, fora do total e fora do mapa.`
}

// Total do período (RF-02.36, RN-02.12): soma só os bairros com dados e diz quantos são; sem nenhum, não há número,
// porque ausência nunca vira zero. O fora da cobertura é contagem à parte.
export function TotalPeriodo({ total, foraDaCobertura }: TotalPeriodoProps) {
  const semBairros = total.bairrosComDados === 0
  return (
    <section aria-labelledby="titulo-total" className="flex flex-col gap-1">
      <h3 id="titulo-total" className="text-lg font-semibold">
        Total do período
      </h3>
      {semBairros ? (
        <p>Nenhum bairro tem dados no período.</p>
      ) : (
        <>
          <p className="text-3xl font-semibold tabular-nums">
            {formatadorDeNumero.format(total.casos)}{" "}
            <span className="text-base font-normal text-muted-foreground">
              {total.casos === 1 ? "caso" : "casos"}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {TEXTOS_SAUDE.total(total.bairrosComDados)}
          </p>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        {textoDoForaDaCobertura(foraDaCobertura)}
      </p>
    </section>
  )
}
