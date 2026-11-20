import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type {
  CamadaControlavel,
  IdCamadaControlavel,
} from "@/lib/territorio/estilo-mapa"

type ControleCamadasProps = {
  /** Só camadas já carregadas e desenhadas pelo mapa (RN-005): nada fora do escopo aparece aqui. */
  camadas: readonly Pick<CamadaControlavel, "id" | "rotulo">[]
  ligadas: ReadonlySet<IdCamadaControlavel>
  onAlternar: (id: IdCamadaControlavel) => void
}

// Controle em HTML, não o do MapLibre: cada camada é um interruptor do design system, acessível por teclado.
export function ControleCamadas({
  camadas,
  ligadas,
  onAlternar,
}: ControleCamadasProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold">Camadas do mapa</legend>
      {camadas.map(({ id, rotulo }) => (
        <div key={id} className="flex items-center gap-2">
          <Switch
            id={`camada-${id}`}
            checked={ligadas.has(id)}
            onCheckedChange={() => onAlternar(id)}
          />
          <Label htmlFor={`camada-${id}`}>{rotulo}</Label>
        </div>
      ))}
    </fieldset>
  )
}
