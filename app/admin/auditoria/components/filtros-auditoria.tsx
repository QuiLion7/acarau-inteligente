"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  EVENTOS_AUDITORIA,
  TIPOS_EVENTO_AUDITORIA,
} from "@/lib/auditoria/eventos-auditoria"
import {
  CONTA_DESCONHECIDA,
  type FiltrosAuditoria,
} from "@/lib/auditoria/tipos-auditoria"
import { useParametrosAuditoria } from "@/hooks/use-parametros-auditoria"
import { TEXTOS_AUDITORIA } from "@/lib/config/textos-auditoria"

const TODOS = "todos"
const TEXTOS = TEXTOS_AUDITORIA.filtros

const OPCOES_TIPO = [
  { value: TODOS, label: TEXTOS.todosTipos },
  ...TIPOS_EVENTO_AUDITORIA.map((tipo) => ({
    value: tipo,
    label: EVENTOS_AUDITORIA[tipo].rotulo,
  })),
]

type FiltrosAuditoriaProps = {
  filtros: FiltrosAuditoria
  contas: readonly { usuario: string; nome: string }[]
  haFiltro: boolean
}

// Filtros da auditoria (RF-05.27): tudo vive na URL; o Server Component relê e a lista se renderiza de novo. Mudar um
// filtro volta para a primeira página. Datas são dias inteiros no fuso de Brasília (o servidor converte).
export function FiltrosAuditoriaForm({
  filtros,
  contas,
  haFiltro,
}: FiltrosAuditoriaProps) {
  const { aplicarFiltros: aplicar, limparFiltros } = useParametrosAuditoria()
  const opcoesConta = [
    { value: TODOS, label: TEXTOS.todasContas },
    ...contas.map(({ usuario, nome }) => ({ value: usuario, label: nome })),
    { value: CONTA_DESCONHECIDA, label: TEXTOS.contaDesconhecida },
  ]

  return (
    <section
      aria-labelledby="titulo-filtros-auditoria"
      className="flex flex-col gap-4"
    >
      <h2 id="titulo-filtros-auditoria" className="sr-only">
        {TEXTOS.titulo}
      </h2>
      <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <Field className="w-full md:w-64">
          <FieldLabel id="filtro-tipo-rotulo">{TEXTOS.tipo}</FieldLabel>
          <Select
            value={filtros.tipo ?? TODOS}
            onValueChange={(novo) =>
              novo !== null && aplicar({ tipo: novo === TODOS ? null : novo })
            }
            items={OPCOES_TIPO}
          >
            <SelectTrigger
              id="filtro-tipo"
              aria-labelledby="filtro-tipo-rotulo"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPCOES_TIPO.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-full md:w-64">
          <FieldLabel id="filtro-conta-rotulo">{TEXTOS.conta}</FieldLabel>
          <Select
            value={filtros.conta ?? TODOS}
            onValueChange={(novo) =>
              novo !== null && aplicar({ conta: novo === TODOS ? null : novo })
            }
            items={opcoesConta}
          >
            <SelectTrigger
              id="filtro-conta"
              aria-labelledby="filtro-conta-rotulo"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcoesConta.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field className="w-full md:w-44">
          <FieldLabel htmlFor="filtro-de">{TEXTOS.de}</FieldLabel>
          <Input
            id="filtro-de"
            type="date"
            // A chave refaz o campo quando o filtro é limpo pela URL.
            key={`de-${filtros.de ?? "vazio"}`}
            defaultValue={filtros.de ?? ""}
            onChange={(evento) => aplicar({ de: evento.target.value || null })}
          />
        </Field>
        <Field className="w-full md:w-44">
          <FieldLabel htmlFor="filtro-ate">{TEXTOS.ate}</FieldLabel>
          <Input
            id="filtro-ate"
            type="date"
            key={`ate-${filtros.ate ?? "vazio"}`}
            defaultValue={filtros.ate ?? ""}
            onChange={(evento) => aplicar({ ate: evento.target.value || null })}
          />
        </Field>
        {haFiltro ? (
          <Button type="button" variant="outline" onClick={limparFiltros}>
            {TEXTOS.limpar}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
