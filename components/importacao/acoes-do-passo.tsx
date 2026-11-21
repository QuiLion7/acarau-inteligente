import { Button } from "@/components/ui/button"

type AcoesDoPassoProps = {
  onVoltar?: () => void
  onContinuar?: () => void
  podeContinuar?: boolean
  onCancelar: () => void
}

// Navegação comum aos passos: Cancelar descarta tudo e está sempre à mão (RF-02.07).
export function AcoesDoPasso({
  onVoltar,
  onContinuar,
  podeContinuar = true,
  onCancelar,
}: AcoesDoPassoProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {onVoltar ? (
        <Button type="button" variant="outline" onClick={onVoltar}>
          Voltar
        </Button>
      ) : null}
      {onContinuar ? (
        <Button type="button" onClick={onContinuar} disabled={!podeContinuar}>
          Continuar
        </Button>
      ) : null}
      <Button type="button" variant="ghost" onClick={onCancelar}>
        Cancelar importação
      </Button>
    </div>
  )
}
