import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TEXTOS_OBRAS } from "@/lib/config/textos-obras"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { ROTULO_SITUACAO_OBRA, SITUACOES_OBRA } from "@/lib/obras/situacao-obra"
import { formatarData, formatarValorEmReais } from "@/lib/obras/valores-obra"
import type { SecaoObras } from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.obras

// Obras (RF-05.13): resumo e lista do filtro (só o bairro filtra, DV-42), com a etiqueta SINTETICO e o aviso de que
// valor previsto não é valor pago (RN-021). O título é texto digitado e entra como texto, nunca como HTML.
export function SecaoObrasPrevia({ obras }: { obras: SecaoObras }) {
  const { resumo } = obras
  return (
    <section aria-labelledby="previa-obras" className="flex flex-col gap-4">
      <h3 id="previa-obras" className="text-xl font-semibold">
        {TEXTOS_RELATORIOS.secoes.obras}
      </h3>
      <Alert>
        <AlertDescription>
          <strong>{TEXTOS_RELATORIOS.dadosSinteticos}</strong>:{" "}
          {TEXTOS_OBRAS.faixaSintetico}
        </AlertDescription>
      </Alert>
      <section
        aria-labelledby="previa-obras-resumo"
        className="flex flex-col gap-2"
      >
        <h4 id="previa-obras-resumo" className="text-lg font-semibold">
          {TEXTOS.resumo}
        </h4>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="font-medium">{TEXTOS.total}</dt>
          <dd className="tabular-nums">{resumo.total}</dd>
          {SITUACOES_OBRA.map((situacao) => (
            <div key={situacao} className="contents">
              <dt className="font-medium">{ROTULO_SITUACAO_OBRA[situacao]}</dt>
              <dd className="tabular-nums">{resumo.porSituacao[situacao]}</dd>
            </div>
          ))}
          <dt className="font-medium">{TEXTOS.semLocalizacao}</dt>
          <dd className="tabular-nums">{resumo.semLocalizacao}</dd>
        </dl>
      </section>
      <section
        aria-labelledby="previa-obras-lista"
        className="flex flex-col gap-2"
      >
        <h4 id="previa-obras-lista" className="text-lg font-semibold">
          {TEXTOS.lista}
        </h4>
        {obras.lista.length === 0 ? (
          <p className="text-sm">{TEXTOS.nenhuma}</p>
        ) : (
          <Table>
            <TableCaption className="sr-only">{TEXTOS.lista}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{TEXTOS.colunas.obra}</TableHead>
                <TableHead>{TEXTOS.colunas.situacao}</TableHead>
                <TableHead>{TEXTOS.colunas.bairro}</TableHead>
                <TableHead>{TEXTOS.colunas.dataPrevista}</TableHead>
                {obras.temValor ? (
                  <TableHead>{TEXTOS_OBRAS.valorPrevisto.rotulo}</TableHead>
                ) : null}
                <TableHead>{TEXTOS.colunas.origem}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {obras.lista.map((obra) => (
                <TableRow key={obra.id}>
                  <TableCell>{obra.titulo}</TableCell>
                  <TableCell>{ROTULO_SITUACAO_OBRA[obra.situacao]}</TableCell>
                  <TableCell>{obra.bairro}</TableCell>
                  <TableCell>
                    {obra.dataPrevista
                      ? formatarData(obra.dataPrevista)
                      : TEXTOS.semDataPrevista}
                  </TableCell>
                  {obras.temValor ? (
                    <TableCell className="tabular-nums">
                      {obra.valorPrevistoCentavos === null
                        ? TEXTOS_OBRAS.naoInformado
                        : formatarValorEmReais(obra.valorPrevistoCentavos)}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <Badge variant="secondary">{obra.proveniencia}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {obras.temValor ? (
          <p className="text-sm font-medium">{TEXTOS.valorPrevisto}</p>
        ) : null}
      </section>
    </section>
  )
}
