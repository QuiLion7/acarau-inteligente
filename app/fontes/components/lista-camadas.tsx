import type { CamadaCarregada } from "@/lib/config/camadas-carregadas"

// Só renderiza camada recebida: quem decide o que está carregado é `camadas-carregadas.ts` (RN-005).
export function ListaCamadas({
  camadas,
}: {
  camadas: readonly CamadaCarregada[]
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {camadas.map((camada) => (
        <article
          key={camada.id}
          aria-labelledby={`camada-${camada.id}`}
          className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground"
        >
          <h2 id={`camada-${camada.id}`} className="font-medium">
            {camada.nome}
          </h2>
          <dl className="flex flex-col gap-1 text-sm text-muted-foreground">
            <Campo rotulo="Fonte" valor={camada.fonte} />
            <Campo rotulo="Etiqueta" valor={camada.etiqueta} />
            <Campo rotulo="Versão" valor={camada.versao} />
            <Campo rotulo="Data de referência" valor={camada.dataReferencia} />
            <Campo rotulo="Cobertura" valor={camada.cobertura} />
          </dl>
          <div className="flex flex-col gap-1 text-sm">
            <h3 className="text-muted-foreground">Limitações conhecidas</h3>
            <ul className="list-disc pl-5">
              {camada.limitacoes.map((limitacao) => (
                <li key={limitacao}>{limitacao}</li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap gap-x-1.5">
      <dt>{rotulo}:</dt>
      <dd className="text-foreground">{valor}</dd>
    </div>
  )
}
