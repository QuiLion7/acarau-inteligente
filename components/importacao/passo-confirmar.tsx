"use client"

import { useForm } from "@tanstack/react-form"
import Link from "next/link"

import { AcoesDoPasso } from "@/components/importacao/acoes-do-passo"
import type { EntradaDoArquivo } from "@/components/importacao/estado-assistente"
import { EscolhaDestino } from "@/components/importacao/escolha-destino"
import { TituloDoPasso } from "@/components/importacao/titulo-do-passo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useConfirmarImportacao } from "@/hooks/query/use-importacao"
import { useDatasets } from "@/hooks/query/use-datasets"
import { ApiError } from "@/lib/api/api-error"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import type {
  AnaliseConfirmavel,
  ArquivoLido,
  DecisaoBairro,
} from "@/lib/importacao/tipos-importacao"
import { flexionar } from "@/lib/territorio/formato"
import {
  confirmarImportacaoSchema,
  type ConfirmarImportacao,
} from "@/lib/validations/importacao-schema"

const SEM_METADADOS = { nome: "", indicador: "", fonte: "" }
const CAMINHO_DO_ASSISTENTE = "/saude/importar"
const LINK_PARA_ENTRAR = `/entrar?${new URLSearchParams({ motivo: "expirada", retorno: CAMINHO_DO_ASSISTENTE })}`

type PassoConfirmarProps = {
  entrada: EntradaDoArquivo
  arquivo: ArquivoLido
  analise: AnaliseConfirmavel
  decisoes: readonly DecisaoBairro[]
  focar: boolean
  onVoltar: () => void
  onCancelar: () => void
}

function sessaoExpirou(erro: Error | null): boolean {
  return erro instanceof ApiError && erro.status === 401
}

function ErroDaConfirmacao({ erro }: { erro: Error }) {
  if (sessaoExpirou(erro)) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {TEXTOS_SAUDE.sessaoExpirada}{" "}
          <Link href={LINK_PARA_ENTRAR} className="underline">
            Entrar
          </Link>
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert variant="destructive">
      <AlertDescription>{erro.message}</AlertDescription>
    </Alert>
  )
}

// Passo 5 (RF-02.06, RF-02.22): metadados e destino. O schema é o mesmo da rota; nada foi gravado até aqui e o
// arquivo sobe uma vez só, no envio deste formulário (DEC-T-01).
export function PassoConfirmar({
  entrada,
  arquivo,
  analise,
  decisoes,
  focar,
  onVoltar,
  onCancelar,
}: PassoConfirmarProps) {
  const confirmar = useConfirmarImportacao()
  const { data: datasets = [], isLoading: carregandoDatasets } = useDatasets()
  const valoresIniciais: ConfirmarImportacao = {
    separador: arquivo.separador,
    mapeamento: analise.mapeamento,
    decisoes: [...decisoes],
    metadados: SEM_METADADOS,
    destino: { tipo: "novo" },
  }
  const form = useForm({
    defaultValues: valoresIniciais,
    validators: { onSubmit: confirmarImportacaoSchema },
    onSubmit: ({ value }) =>
      confirmar.mutate({
        arquivo: { nome: entrada.nome, bytes: entrada.bytes },
        dados: value,
      }),
  })

  function handleEscolherNovo() {
    form.setFieldValue("destino", { tipo: "novo" })
    form.setFieldValue("metadados", SEM_METADADOS)
  }

  // Nova versão herda os metadados do dataset (RF-02.22): o formulário os mostra só para leitura.
  function handleEscolherDataset(datasetId: string) {
    const escolhido = datasets.find(({ id }) => id === datasetId)
    if (!escolhido) return
    form.setFieldValue("destino", { tipo: "nova-versao", datasetId })
    form.setFieldValue("metadados", {
      nome: escolhido.nome,
      indicador: escolhido.indicador,
      fonte: escolhido.fonte,
    })
  }

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void form.handleSubmit()
      }}
      className="flex flex-col gap-6"
    >
      <TituloDoPasso focar={focar}>Confirmar importação</TituloDoPasso>
      <p className="max-w-prose text-muted-foreground">
        {arquivo.nome}:{" "}
        {flexionar(
          analise.linhasNormalizadas.length,
          "linha será gravada",
          "linhas serão gravadas"
        )}
        . O dataset nasce privado e só o analista o vê até ser publicado. Os
        dados da demonstração são sempre sintéticos e a unidade é casos.
      </p>
      {confirmar.isError ? <ErroDaConfirmacao erro={confirmar.error} /> : null}

      <form.Subscribe selector={(estado) => estado.values.destino}>
        {(destino) => (
          <EscolhaDestino
            destino={destino}
            datasets={datasets}
            carregando={carregandoDatasets}
            onEscolherNovo={handleEscolherNovo}
            onEscolherDataset={handleEscolherDataset}
          />
        )}
      </form.Subscribe>

      <form.Subscribe selector={(estado) => estado.values.destino.tipo}>
        {(tipo) => (
          <FieldGroup className="max-w-xl">
            {(
              [
                ["nome", "Nome do dataset"],
                ["indicador", "Indicador"],
                ["fonte", "Fonte"],
              ] as const
            ).map(([chave, rotulo]) => (
              <form.Field key={chave} name={`metadados.${chave}`}>
                {(campo) => (
                  <Field data-invalid={campo.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor={campo.name}>{rotulo}</FieldLabel>
                    <Input
                      id={campo.name}
                      name={campo.name}
                      value={campo.state.value}
                      readOnly={tipo === "nova-versao"}
                      onBlur={campo.handleBlur}
                      onChange={(evento) =>
                        campo.handleChange(evento.target.value)
                      }
                      aria-invalid={campo.state.meta.errors.length > 0}
                    />
                    {tipo === "nova-versao" ? (
                      <FieldDescription>
                        Vem do dataset escolhido.
                      </FieldDescription>
                    ) : null}
                    <FieldError errors={campo.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            ))}
          </FieldGroup>
        )}
      </form.Subscribe>

      <div className="flex flex-wrap gap-2">
        <form.Subscribe selector={(estado) => estado.canSubmit}>
          {(podeEnviar) => (
            <Button type="submit" disabled={!podeEnviar || confirmar.isPending}>
              {confirmar.isPending ? "Importando..." : "Confirmar importação"}
            </Button>
          )}
        </form.Subscribe>
        <AcoesDoPasso onVoltar={onVoltar} onCancelar={onCancelar} />
      </div>
    </form>
  )
}
