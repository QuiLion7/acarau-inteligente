import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { formatarInstante } from "@/lib/obras/valores-obra"
import type { SecaoFontes } from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.fontes

// Fontes e limitações (RF-05.14): as camadas carregadas, os datasets publicados e as obras, com a proveniência de cada
// um, a atribuição do OpenStreetMap (RN-029) e as limitações da página Fontes.
export function SecaoFontesPrevia({ fontes }: { fontes: SecaoFontes }) {
  return (
    <section aria-labelledby="previa-fontes" className="flex flex-col gap-4">
      <h3 id="previa-fontes" className="text-xl font-semibold">
        {TEXTOS_RELATORIOS.secoes.fontes}
      </h3>
      <section
        aria-labelledby="previa-fontes-camadas"
        className="flex flex-col gap-2"
      >
        <h4 id="previa-fontes-camadas" className="text-lg font-semibold">
          {TEXTOS.camadas}
        </h4>
        <ul aria-label={TEXTOS.camadas} className="flex flex-col gap-3">
          {fontes.camadas.map((camada) => (
            <li key={camada.id} className="rounded-lg border p-3">
              <h5 className="font-medium">{camada.nome}</h5>
              <dl className="mt-1 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-0.5 text-sm">
                <dt className="font-medium">{TEXTOS.camadaColunas.fonte}</dt>
                <dd>{camada.fonte}</dd>
                <dt className="font-medium">{TEXTOS.camadaColunas.etiqueta}</dt>
                <dd>{camada.etiqueta}</dd>
                <dt className="font-medium">{TEXTOS.camadaColunas.versao}</dt>
                <dd>{camada.versao}</dd>
                <dt className="font-medium">
                  {TEXTOS.camadaColunas.dataReferencia}
                </dt>
                <dd>{camada.dataReferencia}</dd>
              </dl>
            </li>
          ))}
        </ul>
      </section>
      <section
        aria-labelledby="previa-fontes-datasets"
        className="flex flex-col gap-2"
      >
        <h4 id="previa-fontes-datasets" className="text-lg font-semibold">
          {TEXTOS.datasets}
        </h4>
        {fontes.datasets.length === 0 ? (
          <p className="text-sm">{TEXTOS.datasetsNenhum}</p>
        ) : (
          <ul className="flex list-disc flex-col gap-1 pl-6 text-sm">
            {fontes.datasets.map(({ nome, versao, publicadoEm }) => (
              <li key={`${nome}-${versao}`}>
                {TEXTOS.datasetVersao(nome, versao)}
                {publicadoEm
                  ? `, ${TEXTOS.publicadoEm(formatarInstante(publicadoEm))}`
                  : ""}
                {" - SINTETICO"}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section
        aria-labelledby="previa-fontes-obras"
        className="flex flex-col gap-2"
      >
        <h4 id="previa-fontes-obras" className="text-lg font-semibold">
          {TEXTOS.obras}
        </h4>
        <p className="text-sm">
          {TEXTOS.obrasResumo(
            fontes.obras.quantidade,
            fontes.obras.ultimaAtualizacao
              ? formatarInstante(fontes.obras.ultimaAtualizacao)
              : null
          )}{" "}
          SINTETICO.
        </p>
      </section>
      <section
        aria-labelledby="previa-fontes-limitacoes"
        className="flex flex-col gap-2"
      >
        <h4 id="previa-fontes-limitacoes" className="text-lg font-semibold">
          {TEXTOS.limitacoes}
        </h4>
        <ul className="flex list-disc flex-col gap-1 pl-6 text-sm">
          {fontes.camadas.flatMap((camada) =>
            camada.limitacoes.map((limitacao) => (
              <li key={`${camada.id}-${limitacao}`}>
                <span className="font-medium">{camada.nome}:</span> {limitacao}
              </li>
            ))
          )}
        </ul>
        <p className="text-sm">{TEXTOS.atribuicao}</p>
      </section>
    </section>
  )
}
