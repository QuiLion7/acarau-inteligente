import { SimboloObra } from "@/components/obras/simbolo-obra"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import type { ResumoObras as Resumo } from "@/lib/obras/filtro-obras"
import { ROTULO_SITUACAO_OBRA, SITUACOES_OBRA } from "@/lib/obras/situacao-obra"

type CardResumoProps = {
  id: string
  titulo: string
  total: number
  simbolo?: React.ReactNode
}

function CardResumo({ id, titulo, total, simbolo }: CardResumoProps) {
  return (
    <Card role="group" aria-labelledby={id} size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {simbolo}
          <h3 id={id}>{titulo}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{total}</p>
      </CardContent>
    </Card>
  )
}

// Resumo do filtro atual (RF-04.09): total, as quatro situações e as obras sem localização. É contagem de cadastro,
// então situação sem obra mostra 0 (RN-04.12).
export function ResumoObras({ resumo }: { resumo: Resumo }) {
  return (
    <section
      aria-labelledby="titulo-resumo-obras"
      className="flex flex-col gap-3"
    >
      <h2 id="titulo-resumo-obras" className="text-xl font-semibold">
        {TEXTOS_OBRAS.secoes.resumo}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <CardResumo
          id="resumo-total"
          titulo={TEXTOS_OBRAS.resumo.total}
          total={resumo.total}
        />
        {SITUACOES_OBRA.map((situacao) => (
          <CardResumo
            key={situacao}
            id={`resumo-${situacao}`}
            titulo={ROTULO_SITUACAO_OBRA[situacao]}
            total={resumo.porSituacao[situacao]}
            simbolo={<SimboloObra situacao={situacao} />}
          />
        ))}
        <CardResumo
          id="resumo-sem-localizacao"
          titulo={TEXTOS_OBRAS.resumo.semLocalizacao}
          total={resumo.semLocalizacao}
        />
      </div>
    </section>
  )
}
