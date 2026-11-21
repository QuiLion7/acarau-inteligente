import { Seletor } from "@/components/importacao/seletor"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { DatasetComVersoes } from "@/lib/validations/datasets-schema"
import type { ConfirmarImportacao } from "@/lib/validations/importacao-schema"

type Destino = ConfirmarImportacao["destino"]

type EscolhaDestinoProps = {
  destino: Destino
  datasets: readonly DatasetComVersoes[]
  /** A lista ainda não chegou (ou falhou): só "novo dataset" fica disponível. */
  carregando: boolean
  onEscolherNovo: () => void
  onEscolherDataset: (datasetId: string) => void
}

function rotuloDoDataset({ nome, versoes }: DatasetComVersoes): string {
  const proxima = Math.max(0, ...versoes.map(({ numero }) => numero)) + 1
  return `${nome} (será a versão ${proxima})`
}

// Destino do conteúdo (RF-02.22): dataset novo, ou nova versão de um existente, que nasce privada como toda versão.
export function EscolhaDestino({
  destino,
  datasets,
  carregando,
  onEscolherNovo,
  onEscolherDataset,
}: EscolhaDestinoProps) {
  const semDatasets = !carregando && datasets.length === 0
  const opcoes = datasets.map((dataset) => ({
    value: dataset.id,
    label: rotuloDoDataset(dataset),
  }))

  function handleTipo(tipo: string) {
    if (tipo === "novo") onEscolherNovo()
    const primeiro = datasets[0]
    if (tipo === "nova-versao" && primeiro) onEscolherDataset(primeiro.id)
  }

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        aria-label="Destino da importação"
        value={destino.tipo}
        onValueChange={handleTipo}
      >
        <Field orientation="horizontal">
          <RadioGroupItem value="novo" id="destino-novo" />
          <FieldLabel htmlFor="destino-novo">Novo dataset</FieldLabel>
        </Field>
        <Field orientation="horizontal">
          <RadioGroupItem
            value="nova-versao"
            id="destino-nova-versao"
            disabled={carregando || semDatasets}
          />
          <FieldLabel htmlFor="destino-nova-versao">
            Nova versão de um dataset existente
          </FieldLabel>
        </Field>
      </RadioGroup>
      {semDatasets ? (
        <FieldDescription>
          Ainda não há dataset para receber uma nova versão.
        </FieldDescription>
      ) : null}
      {destino.tipo === "nova-versao" ? (
        <Seletor
          id="dataset-destino"
          rotulo="Dataset que recebe a nova versão"
          valor={destino.datasetId}
          opcoes={opcoes}
          onChange={onEscolherDataset}
        />
      ) : null}
    </div>
  )
}
