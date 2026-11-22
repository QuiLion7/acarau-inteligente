import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TEXTOS_EDUCACAO } from "@/lib/config/textos-educacao"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import type {
  EscolaPendente,
  FiltrosDoRelatorio,
  SecaoEducacao,
} from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.educacao
const CARDS = TEXTOS_EDUCACAO.cards

type SecaoEducacaoPreviaProps = {
  educacao: SecaoEducacao
  bairro: FiltrosDoRelatorio["bairro"]
}

function Cartao({
  titulo,
  valor,
  detalhe,
}: {
  titulo: string
  valor: number
  detalhe: string
}) {
  return (
    <div
      role="group"
      aria-label={titulo}
      className="flex flex-col gap-1 rounded-lg border p-3"
    >
      <h5 className="text-sm font-medium">{titulo}</h5>
      <p className="text-2xl font-semibold tabular-nums">{valor}</p>
      <p className="text-sm text-muted-foreground">{detalhe}</p>
    </div>
  )
}

function ListaDePendencias({
  titulo,
  escolas,
}: {
  titulo: string
  escolas: readonly EscolaPendente[]
}) {
  return (
    <div className="flex flex-col gap-1">
      <h5 className="text-sm font-medium">{titulo}</h5>
      {escolas.length === 0 ? (
        <p className="text-sm">{TEXTOS.nenhuma}</p>
      ) : (
        <ul className="flex list-disc flex-col gap-0.5 pl-6 text-sm">
          {escolas.map(({ codigoInep, nome }) => (
            <li key={codigoInep}>
              {nome} ({codigoInep})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Educação (RF-05.12): os números do artefato, sem recontar (DV-37), com a escola fora do limite citada à parte
// (DV-39). Sem a camada de escolas a seção diz "fonte ausente" em vez dos números (RN-03.12).
export function SecaoEducacaoPrevia({
  educacao,
  bairro,
}: SecaoEducacaoPreviaProps) {
  const { cards, pendencias } = educacao
  return (
    <section aria-labelledby="previa-educacao" className="flex flex-col gap-4">
      <h3 id="previa-educacao" className="text-xl font-semibold">
        {TEXTOS_RELATORIOS.secoes.educacao}
      </h3>
      {educacao.fonte === null ? (
        <p role="status" className="font-medium">
          {TEXTOS.fonteAusente}
        </p>
      ) : (
        <>
          <p className="text-sm">
            {TEXTOS_EDUCACAO.fonteEData(
              educacao.fonte,
              educacao.dataReferencia ?? TEXTOS_RELATORIOS.naoInformada
            )}
          </p>
          <div
            className="grid gap-3 sm:grid-cols-2"
            role="group"
            aria-label={TEXTOS.cards}
          >
            <Cartao
              titulo={CARDS.registros.titulo}
              valor={cards.totalCatalogo}
              detalhe={CARDS.registros.detalhe}
            />
            <Cartao
              titulo={CARDS.georreferenciadas.titulo}
              valor={cards.comLocalizacao}
              detalhe={CARDS.georreferenciadas.detalhe}
            />
            <Cartao
              titulo={CARDS.semLocalizacao.titulo}
              valor={cards.semLocalizacao}
              detalhe={CARDS.semLocalizacao.detalhe}
            />
            <Cartao
              titulo={CARDS.dentroDosBairros.titulo}
              valor={cards.dentroDeBairros}
              detalhe={CARDS.dentroDosBairros.detalhe}
            />
            <Cartao
              titulo={CARDS.foraDaCobertura.titulo}
              valor={cards.foraDaCobertura}
              detalhe={CARDS.foraDaCobertura.detalhe(cards.foraDoLimite)}
            />
          </div>

          <section
            aria-labelledby="previa-educacao-bairros"
            className="flex flex-col gap-2"
          >
            <h4 id="previa-educacao-bairros" className="text-lg font-semibold">
              {TEXTOS.porBairro}
            </h4>
            <Table>
              <TableCaption className="sr-only">
                {TEXTOS_EDUCACAO.tabela.legenda}
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>UV</TableHead>
                  <TableHead>{TEXTOS.porBairroBairro}</TableHead>
                  <TableHead>{TEXTOS.porBairroTotal}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {educacao.porBairro.map(({ bairro: item, total }) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.uv}</TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell className="tabular-nums">
                      {total === 0 ? TEXTOS_EDUCACAO.tabela.semEscola : total}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {bairro && educacao.escolasDoBairro ? (
            <section
              aria-labelledby="previa-educacao-escolas"
              className="flex flex-col gap-2"
            >
              <h4
                id="previa-educacao-escolas"
                className="text-lg font-semibold"
              >
                {TEXTOS.escolasDoBairro(bairro.nome)}
              </h4>
              {educacao.escolasDoBairro.length === 0 ? (
                <p className="text-sm">{TEXTOS.nenhumaEscolaNoBairro}</p>
              ) : (
                <Table>
                  <TableCaption className="sr-only">
                    {TEXTOS.escolasDoBairro(bairro.nome)}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{TEXTOS.escolasColunas.codigo}</TableHead>
                      <TableHead>{TEXTOS.escolasColunas.nome}</TableHead>
                      <TableHead>{TEXTOS.escolasColunas.dependencia}</TableHead>
                      <TableHead>{TEXTOS.escolasColunas.localizacao}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {educacao.escolasDoBairro.map((escola) => (
                      <TableRow key={escola.codigoInep}>
                        <TableCell>{escola.codigoInep}</TableCell>
                        <TableCell>{escola.nome}</TableCell>
                        <TableCell>{escola.dependencia}</TableCell>
                        <TableCell>{escola.localizacao}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          ) : null}

          <section
            aria-labelledby="previa-educacao-pendencias"
            className="flex flex-col gap-3"
          >
            <h4
              id="previa-educacao-pendencias"
              className="text-lg font-semibold"
            >
              {TEXTOS.pendencias}
            </h4>
            <ListaDePendencias
              titulo={TEXTOS.pendenciasSemLocalizacao}
              escolas={pendencias.semLocalizacao}
            />
            <p className="text-sm">
              {TEXTOS.pendenciasForaDaCobertura(pendencias.foraDaCobertura)}
            </p>
            <ListaDePendencias
              titulo={TEXTOS.pendenciasForaDoLimite}
              escolas={pendencias.foraDoLimite}
            />
            <p className="text-sm text-muted-foreground">
              {TEXTOS_EDUCACAO.pendencias.naoInventa}
            </p>
          </section>
        </>
      )}
    </section>
  )
}
