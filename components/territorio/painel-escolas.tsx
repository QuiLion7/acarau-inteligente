import { FichaEscola } from "@/components/territorio/ficha-escola"
import { TabelaEscolas } from "@/components/territorio/tabela-escolas"
import { Button } from "@/components/ui/button"
import type { Bairro, Escola } from "@/lib/territorio/artefato-schema"

type PainelEscolasProps = {
  escolas: Escola[]
  bairros: Pick<Bairro, "id" | "nome">[]
  bairroSelecionado: Pick<Bairro, "id" | "nome" | "totalEscolas"> | null
  escolaAberta: Escola | null
  fonte: string
  dataReferencia: string
  onAbrirEscola: (codigoInep: string) => void
  onFecharEscola: () => void
}

// Aba de escolas: a ficha da escola aberta (pelo mapa ou pela tabela) em cima, a tabela filtrada embaixo.
export function PainelEscolas({
  escolas,
  bairros,
  bairroSelecionado,
  escolaAberta,
  fonte,
  dataReferencia,
  onAbrirEscola,
  onFecharEscola,
}: PainelEscolasProps) {
  const bairroDaEscola = bairros.find(({ id }) => id === escolaAberta?.bairroId)

  return (
    <div className="flex flex-col gap-6">
      {escolaAberta ? (
        <div className="flex flex-col gap-4">
          <FichaEscola
            escola={escolaAberta}
            bairroNome={bairroDaEscola?.nome ?? null}
          />
          <Button
            variant="outline"
            className="self-start"
            onClick={onFecharEscola}
          >
            Fechar ficha da escola
          </Button>
        </div>
      ) : null}
      <TabelaEscolas
        escolas={escolas}
        bairros={bairros}
        bairroSelecionado={bairroSelecionado}
        fonte={fonte}
        dataReferencia={dataReferencia}
        onAbrirEscola={onAbrirEscola}
      />
    </div>
  )
}
