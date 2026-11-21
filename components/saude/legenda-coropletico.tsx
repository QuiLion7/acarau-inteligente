import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import type { AnalisePeriodo } from "@/lib/saude/analise-periodo"
import { CORES_COROPLETICO } from "@/lib/territorio/estilo-mapa"
import { flexionar } from "@/lib/territorio/formato"

type LegendaCoropleticoProps = {
  indicador: string
  unidade: string
  periodo: string
  classes: AnalisePeriodo["classes"]
  foraDaCobertura: AnalisePeriodo["foraDaCobertura"]
}

const ESTILO_DO_AMOSTRA =
  "inline-block size-4 shrink-0 rounded-sm border border-foreground/60"

function Entrada({
  amostra,
  children,
}: {
  amostra: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-2">
      {amostra}
      <span>{children}</span>
    </li>
  )
}

// Legenda do coroplético (RF-02.31, RF-02.32, CA-02.20): título, unidade, período, método, intervalos e entradas
// próprias para zero, sem dados e fora da cobertura. Cada entrada tem texto: o significado nunca depende só da cor.
export function LegendaCoropletico({
  indicador,
  unidade,
  periodo,
  classes,
  foraDaCobertura,
}: LegendaCoropleticoProps) {
  return (
    <section aria-labelledby="titulo-legenda" className="flex flex-col gap-3">
      <h3 id="titulo-legenda" className="text-lg font-semibold">
        {indicador}
      </h3>
      <p className="text-sm text-muted-foreground">
        Unidade: {unidade}. Período: {periodo}. Método: quantis (até 5 classes).
      </p>
      <ul
        aria-label="Classes do mapa"
        className="flex flex-col gap-1.5 text-sm"
      >
        {classes.classes.map(({ indice, rotulo }) => (
          <Entrada
            key={indice}
            amostra={
              <span
                aria-hidden
                className={ESTILO_DO_AMOSTRA}
                style={{ backgroundColor: CORES_COROPLETICO[indice - 1] }}
              />
            }
          >
            {rotulo}
          </Entrada>
        ))}
        <Entrada
          amostra={
            <span
              aria-hidden
              className={`${ESTILO_DO_AMOSTRA} border-dashed bg-background`}
            />
          }
        >
          Zero informado (0 casos)
        </Entrada>
        <Entrada
          amostra={
            <span
              aria-hidden
              className={`${ESTILO_DO_AMOSTRA} bg-[repeating-linear-gradient(45deg,var(--muted-foreground)_0_1px,transparent_1px_4px)]`}
            />
          }
        >
          Sem dados
        </Entrada>
        <Entrada amostra={<span aria-hidden className="size-4 shrink-0" />}>
          Fora da cobertura:{" "}
          {foraDaCobertura.localidades === 0
            ? "nenhum registro no período (não aparece no mapa)"
            : `${flexionar(foraDaCobertura.casos, "caso", "casos")} em ${flexionar(foraDaCobertura.localidades, "localidade", "localidades")} (não aparece no mapa)`}
        </Entrada>
      </ul>
      {classes.classeUnica ? (
        <p className="text-sm">{TEXTOS_SAUDE.classeUnica}</p>
      ) : null}
      {classes.classes.length === 0 ? (
        <p className="text-sm">
          Nenhum bairro tem casos acima de zero no período: não há classes de
          intervalo.
        </p>
      ) : null}
    </section>
  )
}
