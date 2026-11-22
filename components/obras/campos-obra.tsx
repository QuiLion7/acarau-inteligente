import type { AnyFieldApi } from "@tanstack/react-form"
import type { ComponentProps, ReactNode } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import {
  CATEGORIAS_OBRA,
  ROTULO_CATEGORIA_OBRA,
  ROTULO_SITUACAO_OBRA,
  SITUACOES_OBRA,
} from "@/lib/obras/situacao-obra"
import {
  categoriaObraSchema,
  situacaoObraSchema,
} from "@/lib/validations/obra-schema"

const { form: TEXTOS } = TEXTOS_OBRAS

/** Erros do campo para o `FieldError`: os da validação e, por último, o que o servidor devolveu para ele. */
export function errosDoCampo(campo: AnyFieldApi, erroDoServidor?: string) {
  return [
    ...campo.state.meta.errors,
    ...(erroDoServidor ? [{ message: erroDoServidor }] : []),
  ]
}

type CampoDeTextoProps = {
  campo: AnyFieldApi
  rotulo: string
  erroDoServidor?: string
  descricao?: string
  /** Chamado com o novo texto, além de gravá-lo no campo (a localização avisa o mapa). */
  aoMudar?: (valor: string) => void
} & Pick<
  ComponentProps<typeof Input>,
  "type" | "inputMode" | "autoComplete" | "placeholder"
>

// Campo de texto do formulário: rótulo ligado ao input, `aria-invalid` e o erro junto ao campo (react-next §10).
export function CampoDeTexto({
  campo,
  rotulo,
  erroDoServidor,
  descricao,
  aoMudar,
  ...atributos
}: CampoDeTextoProps) {
  const erros = errosDoCampo(campo, erroDoServidor)
  return (
    <Field data-invalid={erros.length > 0}>
      <FieldLabel htmlFor={campo.name}>{rotulo}</FieldLabel>
      <Input
        id={campo.name}
        name={campo.name}
        value={campo.state.value}
        onBlur={campo.handleBlur}
        onChange={(evento) => {
          campo.handleChange(evento.target.value)
          aoMudar?.(evento.target.value)
        }}
        aria-invalid={erros.length > 0}
        {...atributos}
      />
      {descricao ? <FieldDescription>{descricao}</FieldDescription> : null}
      <FieldError errors={erros} />
    </Field>
  )
}

type CampoComServidor = { campo: AnyFieldApi; erroDoServidor?: string }

// A situação tem só quatro valores e é obrigatória: todas à vista, como botões de rádio (acessíveis só com teclado).
export function CampoDeSituacao({ campo, erroDoServidor }: CampoComServidor) {
  const erros = errosDoCampo(campo, erroDoServidor)
  return (
    <FieldSet data-invalid={erros.length > 0}>
      <FieldLegend variant="label">{TEXTOS.campos.situacao}</FieldLegend>
      <RadioGroup
        aria-label={TEXTOS.campos.situacao}
        className="grid-cols-2"
        value={campo.state.value}
        onValueChange={(valor) => {
          // O grupo devolve texto; só as quatro situações do catálogo entram no formulário.
          const situacao = situacaoObraSchema.safeParse(valor)
          if (situacao.success) campo.handleChange(situacao.data)
        }}
      >
        {SITUACOES_OBRA.map((situacao) => (
          <Field key={situacao} orientation="horizontal">
            <RadioGroupItem value={situacao} id={`situacao-${situacao}`} />
            <FieldLabel htmlFor={`situacao-${situacao}`}>
              {ROTULO_SITUACAO_OBRA[situacao]}
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      <FieldError errors={erros} />
    </FieldSet>
  )
}

// O `Select` não aceita valor vazio como escolha: "sem categoria" tem valor próprio, que vira "" no formulário.
const SEM_CATEGORIA = "sem-categoria"
const OPCOES_CATEGORIA = [
  { value: SEM_CATEGORIA, label: TEXTOS.semCategoria },
  ...CATEGORIAS_OBRA.map((categoria) => ({
    value: categoria,
    label: ROTULO_CATEGORIA_OBRA[categoria],
  })),
]

export function CampoDeCategoria({ campo, erroDoServidor }: CampoComServidor) {
  const erros = errosDoCampo(campo, erroDoServidor)
  return (
    <Field data-invalid={erros.length > 0}>
      <FieldLabel id="rotulo-categoria-form">
        {TEXTOS.campos.categoria}
      </FieldLabel>
      <Select
        value={campo.state.value === "" ? SEM_CATEGORIA : campo.state.value}
        onValueChange={(valor) => {
          if (valor === SEM_CATEGORIA) return campo.handleChange("")
          const categoria = categoriaObraSchema.safeParse(valor)
          if (categoria.success) campo.handleChange(categoria.data)
        }}
        items={OPCOES_CATEGORIA}
      >
        <SelectTrigger
          id={campo.name}
          aria-labelledby="rotulo-categoria-form"
          aria-invalid={erros.length > 0}
          className="w-full"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPCOES_CATEGORIA.map(({ value, label }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError errors={erros} />
    </Field>
  )
}

export function CampoDeDescricao({ campo, erroDoServidor }: CampoComServidor) {
  const erros = errosDoCampo(campo, erroDoServidor)
  return (
    <Field data-invalid={erros.length > 0}>
      <FieldLabel htmlFor={campo.name}>{TEXTOS.campos.descricao}</FieldLabel>
      <Textarea
        id={campo.name}
        name={campo.name}
        rows={3}
        value={campo.state.value}
        onBlur={campo.handleBlur}
        onChange={(evento) => campo.handleChange(evento.target.value)}
        aria-invalid={erros.length > 0}
      />
      <FieldError errors={erros} />
    </Field>
  )
}

type GrupoLocalizacaoProps = {
  /** Os dois campos de coordenada (`form.Field`), entregues como filhos. */
  children: ReactNode
  /** Linha da prévia: o bairro calculado, ou `null` sem ponto válido. */
  previa: string | null
  /** Erro do grupo: ponto fora do município (cliente) ou `localizacao` do servidor. */
  erro: string | null
  /** Ação "Remover localização", só quando há coordenada para remover. */
  remover: ReactNode
}

// Grupo "Localização" (RF-04.16 a RF-04.18): instrução, as duas coordenadas, o bairro calculado antes de salvar e o
// erro do grupo, tudo dentro do mesmo `fieldset` (o teste e o leitor de tela acham o erro no grupo certo).
export function GrupoLocalizacao({
  children,
  previa,
  erro,
  remover,
}: GrupoLocalizacaoProps) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{TEXTOS.localizacao.titulo}</FieldLegend>
      <FieldDescription>{TEXTOS.localizacao.instrucao}</FieldDescription>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      {previa ? (
        <p role="status" className="text-sm font-medium">
          {previa}
        </p>
      ) : null}
      {erro ? <FieldError>{erro}</FieldError> : null}
      {remover}
    </FieldSet>
  )
}

/** Aviso do formulário (sessão expirada ou falha do servidor), sempre com o que o usuário digitou preservado. */
export function AvisoDoFormulario({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  )
}
