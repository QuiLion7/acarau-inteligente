import { AcoesDoPasso } from "@/components/importacao/acoes-do-passo"
import { TituloDoPasso } from "@/components/importacao/titulo-do-passo"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  AnaliseImportacao,
  DecisaoBairro,
  NomeDistinto,
} from "@/lib/importacao/tipos-importacao"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import { flexionar } from "@/lib/territorio/formato"

const FORA_DA_COBERTURA = "fora-da-cobertura"
const NOMES_RECONHECIDOS_VISIVEIS = 100

const rotuloDoBairro = ({ nome, uv }: BairroResumo) => `${nome} (UV ${uv})`

function situacaoDoNome(nome: NomeDistinto): string {
  const { correspondencia } = nome
  if (correspondencia.estado === "reconhecido") return "Reconhecido"
  if (correspondencia.estado === "nao-reconhecido") return "Não reconhecido"
  const candidatos = correspondencia.candidatos.map(rotuloDoBairro).join(", ")
  return `Ambíguo: ${candidatos}`
}

function valorDaDecisao(nome: NomeDistinto): string | null {
  const { decisao } = nome
  if (!decisao) return null
  return decisao.tipo === "bairro" ? decisao.bairroId : FORA_DA_COBERTURA
}

type SeletorDeBairroProps = {
  nome: NomeDistinto
  bairros: readonly BairroResumo[]
  onDecidir: (decisao: DecisaoBairro) => void
}

function SeletorDeBairro({ nome, bairros, onDecidir }: SeletorDeBairroProps) {
  const candidatos =
    nome.correspondencia.estado === "ambiguo"
      ? nome.correspondencia.candidatos
      : []
  const idsDosCandidatos = new Set(candidatos.map(({ id }) => id))
  const demais = bairros.filter(({ id }) => !idsDosCandidatos.has(id))
  const opcoes = [
    ...bairros.map((bairro) => ({
      value: bairro.id,
      label: rotuloDoBairro(bairro),
    })),
    { value: FORA_DA_COBERTURA, label: "Fora da cobertura" },
  ]

  function handleEscolher(valor: string | null) {
    if (valor === null) return
    onDecidir(
      valor === FORA_DA_COBERTURA
        ? { nomeNormalizado: nome.nomeNormalizado, tipo: "fora-da-cobertura" }
        : {
            nomeNormalizado: nome.nomeNormalizado,
            tipo: "bairro",
            bairroId: valor,
          }
    )
  }

  return (
    <Select
      value={valorDaDecisao(nome)}
      onValueChange={handleEscolher}
      items={opcoes}
    >
      <SelectTrigger
        aria-label={`Bairro para o nome ${nome.nomeOriginal.trim()}`}
        className="w-full min-w-48"
      >
        <SelectValue placeholder="Escolha o bairro" />
      </SelectTrigger>
      <SelectContent>
        {candidatos.length > 0 ? (
          <SelectGroup>
            <SelectLabel>Candidatos</SelectLabel>
            {candidatos.map((bairro) => (
              <SelectItem key={bairro.id} value={bairro.id}>
                {rotuloDoBairro(bairro)}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        <SelectGroup>
          <SelectLabel>
            {candidatos.length > 0 ? "Outros bairros" : "Bairros"}
          </SelectLabel>
          {demais.map((bairro) => (
            <SelectItem key={bairro.id} value={bairro.id}>
              {rotuloDoBairro(bairro)}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Sem bairro</SelectLabel>
          <SelectItem value={FORA_DA_COBERTURA}>Fora da cobertura</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function BairroAssociado({ nome, bairros, onDecidir }: SeletorDeBairroProps) {
  if (nome.correspondencia.estado !== "reconhecido") {
    return (
      <SeletorDeBairro nome={nome} bairros={bairros} onDecidir={onDecidir} />
    )
  }
  const { bairroId } = nome.correspondencia
  const bairro = bairros.find(({ id }) => id === bairroId)
  return <span>{bairro ? rotuloDoBairro(bairro) : bairroId}</span>
}

type PassoBairrosProps = {
  analise: AnaliseImportacao
  bairros: readonly BairroResumo[]
  focar: boolean
  onDecidir: (decisao: DecisaoBairro) => void
  onVoltar: () => void
  onContinuar: () => void
  onCancelar: () => void
}

// Passo 3 (RF-02.08 a RF-02.12): cada nome distinto do arquivo com a situação e o bairro; ambíguo e não reconhecido
// exigem decisão antes de seguir, e a decisão vale para todas as linhas do nome (RF-02.11). Nomes são texto.
export function PassoBairros({
  analise,
  bairros,
  focar,
  onDecidir,
  onVoltar,
  onContinuar,
  onCancelar,
}: PassoBairrosProps) {
  const { nomes, pendencias } = analise
  // Os que pedem decisão ficam no topo e na ordem do arquivo: a linha não pula quando o analista decide (RF-02.09).
  const aDecidir = nomes.filter(
    ({ correspondencia }) => correspondencia.estado !== "reconhecido"
  )
  const reconhecidos = nomes.filter(
    ({ correspondencia }) => correspondencia.estado === "reconhecido"
  )
  const reconhecidosVisiveis = reconhecidos.slice(
    0,
    NOMES_RECONHECIDOS_VISIVEIS
  )
  const ocultos = reconhecidos.length - reconhecidosVisiveis.length
  const visiveis = [...aDecidir, ...reconhecidosVisiveis]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <TituloDoPasso focar={focar}>Bairros do arquivo</TituloDoPasso>
        <p className="max-w-prose text-muted-foreground">
          Cada nome do arquivo precisa apontar para um dos 24 bairros ou ser
          marcado como fora da cobertura. Os reconhecidos estão aqui para
          conferência; os demais pedem uma decisão.
        </p>
        <p role="status">
          {flexionar(nomes.length, "nome distinto", "nomes distintos")},{" "}
          {flexionar(reconhecidos.length, "reconhecido", "reconhecidos")}.{" "}
          {pendencias === 0
            ? "Todos têm bairro ou estão fora da cobertura."
            : `${flexionar(pendencias, "nome ainda sem decisão", "nomes ainda sem decisão")}.`}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome no arquivo</TableHead>
            <TableHead>Linhas</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Bairro</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visiveis.map((nome) => (
            <TableRow key={nome.nomeNormalizado}>
              <TableCell className="font-medium">
                {nome.nomeOriginal.trim()}
              </TableCell>
              <TableCell className="tabular-nums">{nome.linhas}</TableCell>
              <TableCell>{situacaoDoNome(nome)}</TableCell>
              <TableCell>
                <BairroAssociado
                  nome={nome}
                  bairros={bairros}
                  onDecidir={onDecidir}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {ocultos > 0 ? (
        <p className="text-sm text-muted-foreground">
          Mostrando os primeiros {NOMES_RECONHECIDOS_VISIVEIS} nomes
          reconhecidos; mais{" "}
          {flexionar(
            ocultos,
            "nome foi associado sozinho",
            "nomes foram associados sozinhos"
          )}
          .
        </p>
      ) : null}

      <AcoesDoPasso
        onVoltar={onVoltar}
        onContinuar={onContinuar}
        podeContinuar={pendencias === 0}
        onCancelar={onCancelar}
      />
    </div>
  )
}
