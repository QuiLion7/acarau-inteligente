import { Badge } from "@/components/ui/badge"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import { formatarInstante } from "@/lib/obras/valores-obra"
import type { ResumoParaFontes } from "@/lib/server/obras/obra-repositorio"

const { fontes: TEXTOS } = TEXTOS_OBRAS

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap gap-x-1.5">
      <dt>{rotulo}:</dt>
      <dd className="text-foreground">{valor}</dd>
    </div>
  )
}

// Entrada das obras em "Fontes e limitações" (RF-04.34, CA-04.23): origem sintética, quantidade e quando mudou a
// última. Obra é cadastro no banco, não camada do artefato, por isso tem entrada própria fora de
// `camadas-carregadas.ts` (DEC-T-11). Sem obra, a data não existe e não é inventada.
export function EntradaObras({ resumo }: { resumo: ResumoParaFontes }) {
  return (
    <section
      aria-labelledby="titulo-obras-fontes"
      className="flex flex-col gap-4"
    >
      <h2 id="titulo-obras-fontes" className="text-2xl font-semibold">
        {TEXTOS.titulo}
      </h2>
      <div className="flex max-w-xl flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground">
        <Badge variant="secondary" className="self-start">
          {TEXTOS_OBRAS.etiquetaSintetico}
        </Badge>
        <dl className="flex flex-col gap-1 text-sm text-muted-foreground">
          <Campo rotulo={TEXTOS.origem} valor={TEXTOS.origemTexto} />
          <Campo
            rotulo={TEXTOS.quantidade}
            valor={
              resumo.quantidade === 0
                ? TEXTOS.semObras
                : TEXTOS_OBRAS.quantidade(resumo.quantidade)
            }
          />
          {resumo.ultimaAtualizacao ? (
            <Campo
              rotulo={TEXTOS.ultimaAtualizacao}
              valor={formatarInstante(resumo.ultimaAtualizacao)}
            />
          ) : null}
        </dl>
        <p className="text-sm">{TEXTOS.aviso}</p>
      </div>
    </section>
  )
}
