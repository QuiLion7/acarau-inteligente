"use client"

import { useForm } from "@tanstack/react-form"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useEntrar } from "@/hooks/query/use-auth"
import { entrarSchema, type EntrarDados } from "@/lib/validations/entrar-schema"

const VALORES_INICIAIS: EntrarDados = { usuario: "", senha: "" }

// Login do analista e do administrador (RF-00.22). O schema é o mesmo da rota; a mensagem de falha é a do servidor
// e o usuário digitado fica no campo (a senha também, até o envio seguinte).
export function FormEntrar({ retorno }: { retorno: string }) {
  const entrar = useEntrar(retorno)
  const form = useForm({
    defaultValues: VALORES_INICIAIS,
    validators: { onSubmit: entrarSchema },
    onSubmit: ({ value }) => entrar.mutate(value),
  })

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void form.handleSubmit()
      }}
      className="flex w-full max-w-md flex-col gap-6"
    >
      {entrar.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{entrar.error.message}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup>
        <form.Field name="usuario">
          {(campo) => (
            <Field data-invalid={campo.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={campo.name}>Usuário</FieldLabel>
              <Input
                id={campo.name}
                name={campo.name}
                autoComplete="username"
                value={campo.state.value}
                onBlur={campo.handleBlur}
                onChange={(evento) => campo.handleChange(evento.target.value)}
                aria-invalid={campo.state.meta.errors.length > 0}
              />
              <FieldError errors={campo.state.meta.errors} />
            </Field>
          )}
        </form.Field>
        <form.Field name="senha">
          {(campo) => (
            <Field data-invalid={campo.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={campo.name}>Senha</FieldLabel>
              <Input
                id={campo.name}
                name={campo.name}
                type="password"
                autoComplete="current-password"
                value={campo.state.value}
                onBlur={campo.handleBlur}
                onChange={(evento) => campo.handleChange(evento.target.value)}
                aria-invalid={campo.state.meta.errors.length > 0}
              />
              <FieldError errors={campo.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </FieldGroup>
      <form.Subscribe selector={(estado) => estado.canSubmit}>
        {(podeEnviar) => (
          <Button type="submit" disabled={!podeEnviar || entrar.isPending}>
            {entrar.isPending ? "Entrando..." : "Entrar"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  )
}
