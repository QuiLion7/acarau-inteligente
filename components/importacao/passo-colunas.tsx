import { AcoesDoPasso } from "@/components/importacao/acoes-do-passo"
import { ROTULO_DO_SEPARADOR } from "@/components/importacao/rotulos-colunas"
import { Seletor } from "@/components/importacao/seletor"
import { TituloDoPasso } from "@/components/importacao/titulo-do-passo"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TEXTOS_SAUDE } from "@/lib/config/textos-saude"
import { LINHAS_PREVIA } from "@/lib/importacao/limites"
import { mapeamentoCompleto } from "@/lib/importacao/mapeamento-colunas"
import type {
  AnaliseImportacao,
  ArquivoLido,
  CampoMapeado,
  MapeamentoParcial,
  Separador,
} from "@/lib/importacao/tipos-importacao"
import { flexionar } from "@/lib/territorio/formato"

const SEM_COLUNA = "nenhuma"

const CAMPOS: readonly { campo: CampoMapeado; rotulo: string }[] = [
  { campo: "bairro", rotulo: "Coluna do bairro" },
  { campo: "periodo", rotulo: "Coluna do período (ano ou mês)" },
  { campo: "casos", rotulo: "Coluna dos casos" },
]

const OPCOES_DE_SEPARADOR = ([",", ";"] as const).map((separador) => ({
  value: separador,
  label: ROTULO_DO_SEPARADOR[separador],
}))

function ehSeparador(valor: string): valor is Separador {
  return valor === "," || valor === ";"
}

type PassoColunasProps = {
  arquivo: ArquivoLido
  analise: AnaliseImportacao
  focar: boolean
  /** O conteúdo já foi importado (CA-02.14): o aviso aparece aqui e o passo não avança. */
  jaImportado: { nome: string; numero: number } | null
  onTrocarSeparador: (separador: Separador | undefined) => void
  onMapear: (mapeamento: MapeamentoParcial) => void
  onContinuar: () => void
  onCancelar: () => void
}

// Passo 2 (RF-02.03 a RF-02.05): prévia como texto, separador detectado (e trocável) e mapeamento das três colunas.
export function PassoColunas({
  arquivo,
  analise,
  focar,
  jaImportado,
  onTrocarSeparador,
  onMapear,
  onContinuar,
  onCancelar,
}: PassoColunasProps) {
  const opcoesDeColuna = [
    { value: SEM_COLUNA, label: "Nenhuma" },
    ...arquivo.cabecalho.map((nome, indice) => ({
      value: String(indice),
      label: nome,
    })),
  ]
  const completo = mapeamentoCompleto(analise.mapeamento)

  function handleMapear(campo: CampoMapeado, valor: string) {
    const indice = valor === SEM_COLUNA ? null : Number(valor)
    onMapear({ ...analise.mapeamento, [campo]: indice })
  }

  function handleTrocarSeparador(valor: string) {
    if (!ehSeparador(valor)) return
    onTrocarSeparador(valor === arquivo.separadorDetectado ? undefined : valor)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <TituloDoPasso focar={focar}>Colunas do arquivo</TituloDoPasso>
        {jaImportado ? (
          <Alert variant="destructive">
            <AlertDescription>
              {TEXTOS_SAUDE.jaImportado(jaImportado.nome, jaImportado.numero)}{" "}
              Cancele a importação e escolha outro arquivo.
            </AlertDescription>
          </Alert>
        ) : null}
        <p className="text-muted-foreground">
          {arquivo.nome}:{" "}
          {flexionar(
            arquivo.linhas.length,
            "linha de dados lida",
            "linhas de dados lidas"
          )}{" "}
          ({arquivo.encoding}).
        </p>
        <p>
          Separador detectado: {ROTULO_DO_SEPARADOR[arquivo.separadorDetectado]}
          .
        </p>
        <div className="max-w-xs">
          <Seletor
            id="separador"
            rotulo="Separador usado na leitura"
            valor={arquivo.separador}
            opcoes={OPCOES_DE_SEPARADOR}
            onChange={handleTrocarSeparador}
          />
        </div>
      </div>

      <Table>
        <TableCaption>
          Prévia das primeiras {LINHAS_PREVIA} linhas, como texto.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Linha</TableHead>
            {arquivo.cabecalho.map((nome, indice) => (
              <TableHead key={indice}>{nome}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {arquivo.linhas.slice(0, LINHAS_PREVIA).map((linha) => (
            <TableRow key={linha.numero}>
              <TableCell className="text-muted-foreground tabular-nums">
                {linha.numero}
              </TableCell>
              {linha.celulas.map((celula, indice) => (
                <TableCell key={indice}>{celula}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Mapeamento das colunas</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {CAMPOS.map(({ campo, rotulo }) => (
            <Seletor
              key={campo}
              id={`coluna-${campo}`}
              rotulo={rotulo}
              valor={
                analise.mapeamento[campo] === null
                  ? SEM_COLUNA
                  : String(analise.mapeamento[campo])
              }
              opcoes={opcoesDeColuna}
              onChange={(valor) => handleMapear(campo, valor)}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {analise.colunasIgnoradas.length === 0
            ? "Nenhuma coluna será ignorada."
            : `Colunas ignoradas: ${analise.colunasIgnoradas.join(", ")}.`}
        </p>
        <p role="status" className="text-sm">
          {completo
            ? "Colunas escolhidas. Pode continuar."
            : "Escolha uma coluna diferente para o bairro, o período e os casos para continuar."}
        </p>
      </div>

      <AcoesDoPasso
        onContinuar={onContinuar}
        podeContinuar={completo && !jaImportado}
        onCancelar={onCancelar}
      />
    </div>
  )
}
