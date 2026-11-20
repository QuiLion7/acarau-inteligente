import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  TEXTOS_TERRITORIO,
  textoEscolasGeorreferenciadas,
} from "@/lib/config/textos-territorio"
import type { QualidadeEscolas } from "@/lib/territorio/artefato-schema"

type QuadroQualidadeEscolasProps = {
  qualidade: QualidadeEscolas
  fonte: string
  dataReferencia: string
}

// Os números vêm do artefato (RF-01.21): nada aqui fixa contagem, então trocar a base muda a tela sozinha.
export function QuadroQualidadeEscolas({
  qualidade,
  fonte,
  dataReferencia,
}: QuadroQualidadeEscolasProps) {
  return (
    <section
      aria-labelledby="titulo-qualidade-escolas"
      className="flex flex-col gap-3"
    >
      <h2 id="titulo-qualidade-escolas" className="text-xl font-semibold">
        Qualidade da base de escolas
      </h2>
      <p className="text-sm">
        {textoEscolasGeorreferenciadas(qualidade.comLocalizacao)}
      </p>
      <p className="text-sm text-muted-foreground">
        Fonte: {fonte}. Data de referência: {dataReferencia}.
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Indicador
          rotulo="Registros no catálogo"
          total={qualidade.totalCatalogo}
        />
        <Indicador rotulo="Com localização" total={qualidade.comLocalizacao} />
        <Indicador rotulo="Sem localização" total={qualidade.semLocalizacao} />
        <Indicador
          rotulo="Dentro de bairros"
          total={qualidade.dentroDeBairros}
        />
        <Indicador
          rotulo="Fora da cobertura dos bairros"
          total={qualidade.foraDaCobertura}
        />
        <Indicador
          rotulo="Fora do limite municipal"
          total={qualidade.foraDoLimite}
        />
      </dl>
      <ListaDeEscolas
        titulo="Sem localização (não aparecem no mapa)"
        escolas={qualidade.semLocalizacaoLista}
      />
      <ListaDeEscolas
        titulo="Fora do limite municipal"
        escolas={qualidade.foraDoLimiteLista}
        aviso={TEXTOS_TERRITORIO.escolaForaDoLimite}
      />
    </section>
  )
}

function Indicador({ rotulo, total }: { rotulo: string; total: number }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-2xl font-semibold">{total}</dd>
    </div>
  )
}

type ListaDeEscolasProps = {
  titulo: string
  escolas: QualidadeEscolas["semLocalizacaoLista"]
  aviso?: string
}

function ListaDeEscolas({ titulo, escolas, aviso }: ListaDeEscolasProps) {
  if (escolas.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <ul className="list-disc pl-5 text-sm">
        {escolas.map(({ codigoInep, nome }) => (
          <li key={codigoInep}>
            {nome} (INEP {codigoInep})
          </li>
        ))}
      </ul>
      {aviso ? (
        <Alert>
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
