import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import { rotuloDoBairroDaObra } from "@/lib/obras/apresentacao-obra"
import {
  ROTULO_CATEGORIA_OBRA,
  ROTULO_SITUACAO_OBRA,
} from "@/lib/obras/situacao-obra"
import {
  formatarCoordenada,
  formatarData,
  formatarInstante,
  formatarValorEmReais,
} from "@/lib/obras/valores-obra"
import type { EntradaHistorico, Obra } from "@/lib/validations/obra-schema"

const { ficha: TEXTOS } = TEXTOS_OBRAS
const { campos: ROTULOS } = TEXTOS

type FichaObraProps = {
  obra: Obra
  bairros: readonly { id: string; nome: string }[]
  /** Só quem pode editar recebe (RF-04.14): sem ela a ficha não tem nenhum controle. */
  onEditar?: () => void
}

function Linha({
  rotulo,
  children,
}: {
  rotulo: string
  children: React.ReactNode
}) {
  return (
    <>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{children}</dd>
    </>
  )
}

function textoDaEntrada({ situacaoAnterior, situacaoNova }: EntradaHistorico) {
  return situacaoAnterior === null
    ? TEXTOS_OBRAS.historico.inicial(situacaoNova)
    : TEXTOS_OBRAS.situacaoAlterada(situacaoAnterior, situacaoNova)
}

function Coordenadas({ obra }: { obra: Obra }) {
  if (!obra.localizacao) return TEXTOS_OBRAS.naoInformado
  const { latitude, longitude } = obra.localizacao
  return TEXTOS.coordenadas(
    formatarCoordenada(latitude),
    formatarCoordenada(longitude)
  )
}

// Ficha da obra (RF-04.10, RF-04.27): só leitura, em texto puro, com o histórico da mais recente para a mais antiga
// (a ordem do contrato). O valor previsto sempre vem com o aviso de que não é valor pago (RN-04.05). Não há ação de
// excluir nem de mexer no histórico (CA-04.20).
export function FichaObra({ obra, bairros, onEditar }: FichaObraProps) {
  return (
    <article
      aria-labelledby="titulo-ficha-obra"
      className="flex flex-col gap-4"
    >
      <h3 id="titulo-ficha-obra" className="text-lg font-semibold">
        {obra.titulo}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <Linha rotulo={ROTULOS.situacao}>
          {ROTULO_SITUACAO_OBRA[obra.situacao]}
        </Linha>
        <Linha rotulo={ROTULOS.categoria}>
          {obra.categoria
            ? ROTULO_CATEGORIA_OBRA[obra.categoria]
            : TEXTOS_OBRAS.naoInformado}
        </Linha>
        <Linha rotulo={ROTULOS.secretaria}>
          {obra.secretaria ?? TEXTOS_OBRAS.naoInformado}
        </Linha>
        <Linha rotulo={ROTULOS.bairro}>
          {rotuloDoBairroDaObra(obra, bairros)}
        </Linha>
        <Linha rotulo={ROTULOS.coordenadas}>
          <Coordenadas obra={obra} />
        </Linha>
        <Linha rotulo={ROTULOS.dataInicio}>
          {obra.dataInicio
            ? formatarData(obra.dataInicio)
            : TEXTOS_OBRAS.naoInformado}
        </Linha>
        <Linha rotulo={ROTULOS.dataPrevista}>
          {obra.dataPrevista
            ? formatarData(obra.dataPrevista)
            : TEXTOS_OBRAS.naoInformado}
        </Linha>
        <Linha rotulo={ROTULOS.descricao}>
          {obra.descricao ?? TEXTOS_OBRAS.naoInformado}
        </Linha>
        <Linha rotulo={ROTULOS.atualizadoEm}>
          {formatarInstante(obra.atualizadoEm)}
        </Linha>
        <Linha rotulo={ROTULOS.origem}>
          <Badge variant="secondary">{obra.proveniencia}</Badge>
        </Linha>
        {obra.valorPrevistoCentavos === null ? null : (
          <Linha rotulo={TEXTOS_OBRAS.valorPrevisto.rotulo}>
            {formatarValorEmReais(obra.valorPrevistoCentavos)}
          </Linha>
        )}
      </dl>
      {obra.valorPrevistoCentavos === null ? null : (
        <Alert>
          <AlertDescription>
            {TEXTOS_OBRAS.valorPrevisto.aviso}
          </AlertDescription>
        </Alert>
      )}
      {onEditar ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={onEditar}
        >
          {TEXTOS_OBRAS.acoes.editar}
        </Button>
      ) : null}
      <section
        aria-labelledby="titulo-historico-obra"
        className="flex flex-col gap-2"
      >
        <h4 id="titulo-historico-obra" className="text-sm font-semibold">
          {TEXTOS_OBRAS.historico.titulo}
        </h4>
        <ol className="flex flex-col gap-2 text-sm">
          {obra.historico.map((entrada) => (
            <li key={`${entrada.registradoEm}-${entrada.situacaoNova}`}>
              <p className="font-medium">{textoDaEntrada(entrada)}</p>
              <p className="text-muted-foreground">
                {TEXTOS_OBRAS.historico.autorEData(
                  entrada.autorNome,
                  formatarInstante(entrada.registradoEm)
                )}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </article>
  )
}
