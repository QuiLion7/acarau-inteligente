import { Alert, AlertDescription } from "@/components/ui/alert"
import { ListaDeEscolas } from "@/components/territorio/quadro-qualidade-escolas"
import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"
import { TEXTOS_TERRITORIO } from "@/lib/config/textos-territorio"
import type { QualidadeEscolas } from "@/lib/territorio/artefato-schema"

const { pendencias: TEXTOS } = TEXTOS_EDUCACAO

type QuadroPendenciasProps = {
  qualidade: Pick<QualidadeEscolas, "semLocalizacaoLista" | "foraDoLimiteLista">
}

// Pendências de qualidade da base (RF-03.20): as escolas sem localização e a fora do limite, com a explicação de que a
// demonstração não inventa coordenada. Os totais ficam nos cards e na tabela por bairro, para um número só por conceito.
export function QuadroPendencias({ qualidade }: QuadroPendenciasProps) {
  return (
    <section
      aria-labelledby="titulo-pendencias"
      className="flex flex-col gap-3"
    >
      <h2 id="titulo-pendencias" className="text-xl font-semibold">
        {TEXTOS.titulo}
      </h2>
      <ListaDeEscolas
        titulo={TEXTOS.semLocalizacao}
        escolas={qualidade.semLocalizacaoLista}
      />
      <ListaDeEscolas
        titulo={TEXTOS.foraDoLimite}
        escolas={qualidade.foraDoLimiteLista}
        aviso={TEXTOS_TERRITORIO.escolaForaDoLimite}
      />
      <Alert>
        <AlertDescription>{TEXTOS.naoInventa}</AlertDescription>
      </Alert>
    </section>
  )
}
