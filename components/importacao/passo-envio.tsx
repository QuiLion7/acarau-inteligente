import { Alert, AlertDescription } from "@/components/ui/alert"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { TituloDoPasso } from "@/components/importacao/titulo-do-passo"
import { LINHAS_MAXIMAS, TAMANHO_MAXIMO_BYTES } from "@/lib/importacao/limites"
import { mensagemDaRecusa } from "@/lib/importacao/mensagens"
import type { RecusaArquivo } from "@/lib/importacao/tipos-importacao"

const LIMITE_EM_MB = TAMANHO_MAXIMO_BYTES / (1024 * 1024)

type PassoEnvioProps = {
  recusa: RecusaArquivo | null
  focar: boolean
  onEscolher: (arquivo: File) => void
}

// Passo 1 (RF-02.01, RF-02.02): a recusa chega com o limite excedido ou o motivo e a linha, e nada foi enviado ao servidor.
export function PassoEnvio({ recusa, focar, onEscolher }: PassoEnvioProps) {
  return (
    <div className="flex flex-col gap-4">
      <TituloDoPasso focar={focar}>Enviar arquivo</TituloDoPasso>
      <p className="max-w-prose text-muted-foreground">
        Envie um arquivo CSV com o bairro, o período (ano ou mês) e o número de
        casos. O arquivo só sai do seu computador quando você confirmar a
        importação.
      </p>
      {recusa ? (
        <Alert variant="destructive">
          <AlertDescription>{mensagemDaRecusa(recusa)}</AlertDescription>
        </Alert>
      ) : null}
      <Field className="max-w-md">
        <FieldLabel htmlFor="arquivo-csv">Arquivo CSV</FieldLabel>
        <Input
          id="arquivo-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={(evento) => {
            const arquivo = evento.target.files?.[0]
            if (arquivo) onEscolher(arquivo)
          }}
        />
        <FieldDescription>
          Até {LIMITE_EM_MB} MB e {LINHAS_MAXIMAS.toLocaleString("pt-BR")}{" "}
          linhas de dados, em UTF-8, com vírgula ou ponto e vírgula.
        </FieldDescription>
      </Field>
    </div>
  )
}
