import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"
import type { Bairro, QualidadeEscolas } from "@/lib/territorio/artefato-schema"
import { foraDaCoberturaDosBairros } from "@/lib/territorio/contagem-cobertura"

const { cards: TEXTOS } = TEXTOS_EDUCACAO

type CardsEducacaoProps = {
  qualidade: QualidadeEscolas
  /** O bairro escolhido ganha um card próprio; os cinco descrevem sempre a base inteira (PR-02). */
  bairroSelecionado: Pick<Bairro, "nome" | "uv" | "totalEscolas"> | null
  fonte: string
  dataReferencia: string
}

type CardIndicadorProps = {
  id: string
  titulo: string
  valor: string
  detalhe: string
  fonteEData: string
}

function CardIndicador({
  id,
  titulo,
  valor,
  detalhe,
  fonteEData,
}: CardIndicadorProps) {
  return (
    <Card role="group" aria-labelledby={id} size="sm">
      <CardHeader>
        <CardTitle>
          <h3 id={id}>{titulo}</h3>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-3xl font-semibold tabular-nums">{valor}</p>
        <p className="text-sm text-muted-foreground">{detalhe}</p>
        <p className="text-xs text-muted-foreground">{fonteEData}</p>
      </CardContent>
    </Card>
  )
}

// Cards da Educação (RF-03.14, RF-03.17): os números vêm de `qualidade` e de `totalEscolas`, sem recontar (DV-37). A
// escola fora do limite está dentro de `foraDaCobertura` no artefato; o card a tira da conta (DV-39) e a cita à parte.
export function CardsEducacao({
  qualidade,
  bairroSelecionado,
  fonte,
  dataReferencia,
}: CardsEducacaoProps) {
  const fonteEData = TEXTOS_EDUCACAO.fonteEData(fonte, dataReferencia)
  const foraDaCobertura = foraDaCoberturaDosBairros(qualidade)
  return (
    <section
      aria-label={TEXTOS.resumo}
      className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <CardIndicador
        id="card-registros"
        titulo={TEXTOS.registros.titulo}
        valor={String(qualidade.totalCatalogo)}
        detalhe={TEXTOS.registros.detalhe}
        fonteEData={fonteEData}
      />
      <CardIndicador
        id="card-georreferenciadas"
        titulo={TEXTOS.georreferenciadas.titulo}
        valor={String(qualidade.comLocalizacao)}
        detalhe={TEXTOS.georreferenciadas.detalhe}
        fonteEData={fonteEData}
      />
      <CardIndicador
        id="card-sem-localizacao"
        titulo={TEXTOS.semLocalizacao.titulo}
        valor={String(qualidade.semLocalizacao)}
        detalhe={TEXTOS.semLocalizacao.detalhe}
        fonteEData={fonteEData}
      />
      <CardIndicador
        id="card-dentro-dos-bairros"
        titulo={TEXTOS.dentroDosBairros.titulo}
        valor={String(qualidade.dentroDeBairros)}
        detalhe={TEXTOS.dentroDosBairros.detalhe}
        fonteEData={fonteEData}
      />
      <CardIndicador
        id="card-fora-da-cobertura"
        titulo={TEXTOS.foraDaCobertura.titulo}
        valor={String(foraDaCobertura)}
        detalhe={TEXTOS.foraDaCobertura.detalhe(qualidade.foraDoLimite)}
        fonteEData={fonteEData}
      />
      {bairroSelecionado ? (
        <CardIndicador
          id="card-bairro"
          titulo={TEXTOS.bairro.titulo(bairroSelecionado.nome)}
          valor={TEXTOS.bairro.valor(bairroSelecionado.totalEscolas)}
          detalhe={TEXTOS.bairro.detalhe}
          fonteEData={fonteEData}
        />
      ) : null}
    </section>
  )
}
