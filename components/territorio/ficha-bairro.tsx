import { Alert, AlertDescription } from "@/components/ui/alert"
import { TEXTOS_TERRITORIO } from "@/lib/config/textos-territorio"
import type { Bairro } from "@/lib/territorio/artefato-schema"
import { flexionar, formatarAreaM2 } from "@/lib/territorio/formato"

const AREA_NAO_INFORMADA_NA_LEI = "Não informada na lei"

// Texto puro: nada dos dados vira HTML (RF-01.18). Escola ausente nunca vira "0" sem a ressalva da base (RN-01.04).
export function FichaBairro({ bairro }: { bairro: Bairro }) {
  return (
    <article
      aria-labelledby="titulo-ficha-bairro"
      className="flex flex-col gap-4"
    >
      <h2 id="titulo-ficha-bairro" className="text-xl font-semibold">
        {bairro.nome}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <Linha rotulo="Nome na lei" valor={bairro.nomeLei} />
        <Linha rotulo="Código da UV" valor={String(bairro.uv)} />
        <Linha rotulo="Fonte" valor={bairro.fonte} />
        <Linha rotulo="Etiqueta" valor={bairro.etiqueta} />
        <Linha
          rotulo="Área calculada"
          valor={formatarAreaM2(bairro.areaCalculadaM2)}
        />
        <Linha
          rotulo="Área declarada na lei"
          valor={
            bairro.areaLeiM2 === null
              ? AREA_NAO_INFORMADA_NA_LEI
              : formatarAreaM2(bairro.areaLeiM2)
          }
        />
        <Linha
          rotulo="Escolas na base disponível"
          valor={
            bairro.totalEscolas === 0
              ? "Nenhuma"
              : flexionar(bairro.totalEscolas, "escola", "escolas")
          }
        />
      </dl>
      {bairro.totalEscolas === 0 ? (
        <p className="text-sm text-muted-foreground">
          {TEXTOS_TERRITORIO.bairroSemEscola}
        </p>
      ) : null}
      <Alert>
        <AlertDescription>
          {TEXTOS_TERRITORIO.avisoReconstrucao}
        </AlertDescription>
      </Alert>
    </article>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </>
  )
}
