import type { CamadaCarregada } from "@/lib/config/camadas-carregadas"

// Só renderiza camada recebida: quem decide o que está carregado é `camadas-carregadas.ts` (RN-005).
export function ListaCamadas({
  camadas,
}: {
  camadas: readonly CamadaCarregada[]
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {camadas.map((camada) => (
        <li
          key={camada.id}
          className="flex flex-col gap-1 rounded-xl border bg-card p-4 text-card-foreground"
        >
          <h2 className="font-medium">{camada.nome}</h2>
          <dl className="text-sm text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>Fonte:</dt>
              <dd className="text-foreground">{camada.fonte}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Versão:</dt>
              <dd className="text-foreground">{camada.versao}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  )
}
