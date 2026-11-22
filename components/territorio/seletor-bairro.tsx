"use client"

import { useMemo } from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import type { SelecaoBairro } from "@/lib/filtros/filtros-url"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import { buscarBairros } from "@/lib/territorio/busca-bairros"
import { normalizarParaBusca } from "@/lib/territorio/nome-bairro"

const ROTULO_TODOS = "Todos os bairros"
// Valor da opção "Todos os bairros": nenhum ID de bairro (`uv-NN`) é vazio.
const VALOR_TODOS = ""

type OpcaoBairro = {
  value: string
  label: string
  bairro: BairroResumo | null
}

type SeletorBairroProps = {
  id: string
  bairros: readonly BairroResumo[]
  selecao: SelecaoBairro
  onSelecionar: (idBairro: string) => void
  onLimpar: () => void
}

function montarOpcoes(bairros: readonly BairroResumo[]): OpcaoBairro[] {
  return [
    { value: VALOR_TODOS, label: ROTULO_TODOS, bairro: null },
    ...bairros.map((bairro) => ({
      value: bairro.id,
      label: `${bairro.nome} (UV ${bairro.uv})`,
      bairro,
    })),
  ]
}

// A busca é a do Território (nome, nome da lei ou UV, sem acento nem caixa); "Todos os bairros" sai quando o
// termo não casa com o próprio rótulo.
function opcaoCasaComTermo({ bairro }: OpcaoBairro, termo: string): boolean {
  if (bairro === null) {
    return normalizarParaBusca(ROTULO_TODOS).includes(
      normalizarParaBusca(termo)
    )
  }
  return buscarBairros([bairro], termo).length > 0
}

// Seletor de bairro com busca (RF-03.06, DEC-T-02): escreve no filtro global `bairro` pelas funções do chamador, as
// mesmas do clique no mapa, no ranking e na tabela, e reflete a seleção que vem de fora (RN-03.05). Bairro não
// reconhecido deixa o campo vazio: o valor inválido nunca é exibido (DV-12).
export function SeletorBairro({
  id,
  bairros,
  selecao,
  onSelecionar,
  onLimpar,
}: SeletorBairroProps) {
  const opcoes = useMemo(() => montarOpcoes(bairros), [bairros])
  const idSelecionado = selecao.tipo === "bairro" ? selecao.bairro.id : null
  const valorAtual =
    selecao.tipo === "nao-reconhecido" ? null : (idSelecionado ?? VALOR_TODOS)
  const opcaoAtual = opcoes.find(({ value }) => value === valorAtual) ?? null

  function handleValueChange(opcao: OpcaoBairro | null) {
    if (opcao === null || opcao.value === VALOR_TODOS) onLimpar()
    else onSelecionar(opcao.value)
  }

  return (
    <Field className="w-full sm:w-64">
      <FieldLabel htmlFor={id}>Bairro</FieldLabel>
      <Combobox
        items={opcoes}
        value={opcaoAtual}
        onValueChange={handleValueChange}
        filter={opcaoCasaComTermo}
      >
        <ComboboxInput
          id={id}
          placeholder="Buscar por nome ou UV"
          autoComplete="off"
          // Sem o botão de abrir (viria sem nome acessível): a lista abre ao clicar no campo ou pela seta.
          showTrigger={false}
          // O campo mostra o bairro escolhido; selecionar o texto ao focar faz a digitação substituí-lo.
          onFocus={(evento) => evento.currentTarget.select()}
          className="w-full"
        />
        <ComboboxContent>
          <ComboboxEmpty>Nenhum bairro encontrado.</ComboboxEmpty>
          <ComboboxList>
            {(opcao: OpcaoBairro) => (
              <ComboboxItem key={opcao.value} value={opcao}>
                {opcao.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  )
}
