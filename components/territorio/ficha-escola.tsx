import { Alert, AlertDescription } from "@/components/ui/alert"
import { TEXTOS_TERRITORIO } from "@/lib/config/textos-territorio"
import type { Escola } from "@/lib/territorio/artefato-schema"
import { ROTULO_ESTADO_ESCOLA } from "@/lib/territorio/estado-escola"

const SEM_BAIRRO = "Nenhum"

type FichaEscolaProps = {
  escola: Escola
  /** Nome do bairro quando a escola está dentro de um; `null` nos demais estados. */
  bairroNome: string | null
}

// Texto puro, sem HTML dos dados (RF-01.14). Estado fora do comum vem com a ressalva da fonte, nunca corrigido.
export function FichaEscola({ escola, bairroNome }: FichaEscolaProps) {
  const ressalva = RESSALVA_POR_ESTADO[escola.estado]

  return (
    <article
      aria-labelledby="titulo-ficha-escola"
      className="flex flex-col gap-4"
    >
      <h3 id="titulo-ficha-escola" className="text-lg font-semibold">
        {escola.nome}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <Linha rotulo="Código INEP" valor={escola.codigoInep} />
        <Linha rotulo="Dependência administrativa" valor={escola.dependencia} />
        <Linha rotulo="Localização" valor={escola.localizacao} />
        <Linha rotulo="Endereço" valor={escola.endereco} />
        <Linha
          rotulo="Situação de atendimento"
          valor={escola.situacaoAtendimento}
        />
        <Linha rotulo="Bairro" valor={bairroNome ?? SEM_BAIRRO} />
        <Linha
          rotulo="Situação de cobertura"
          valor={ROTULO_ESTADO_ESCOLA[escola.estado]}
        />
        <Linha rotulo="Fonte" valor={escola.fonte} />
        <Linha
          rotulo="Data de referência"
          valor={escola.dataReferencia ?? TEXTOS_TERRITORIO.dataNaoInformada}
        />
        <Linha rotulo="Etiqueta" valor={escola.etiqueta} />
      </dl>
      {ressalva ? (
        <Alert>
          <AlertDescription>{ressalva}</AlertDescription>
        </Alert>
      ) : null}
    </article>
  )
}

const RESSALVA_POR_ESTADO: Partial<Record<Escola["estado"], string>> = {
  "fora-do-limite": TEXTOS_TERRITORIO.escolaForaDoLimite,
  "sem-localizacao": TEXTOS_TERRITORIO.escolaSemLocalizacao,
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </>
  )
}
