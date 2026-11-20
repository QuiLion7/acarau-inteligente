import Link from "next/link"

import { MapaResumo } from "@/components/territorio/mapa-resumo"
import { MODULOS } from "@/lib/config/modulos"
import {
  DESCRICAO_PRODUTO,
  NOME_PRODUTO,
} from "@/lib/config/textos-demonstracao"
import { obterDadosMapaResumo } from "@/lib/server/territorio/territorio-repositorio"

// Início sem nenhum número de dado (RF-00.20): apresenta a demo, mostra o mapa resumido dos bairros (RF-01.25) e
// leva aos módulos.
export default function PaginaInicial() {
  const { bairros, limite } = obterDadosMapaResumo()

  return (
    <div className="flex flex-col gap-8">
      <section className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          {NOME_PRODUTO}
        </h1>
        <p className="text-lg text-muted-foreground">{DESCRICAO_PRODUTO}</p>
        <p>
          Os dados de saúde e de obras são sintéticos e as geometrias foram
          reconstruídas de documentos públicos.{" "}
          <Link
            href="/sobre"
            className="text-primary underline underline-offset-4"
          >
            Leia o aviso completo
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="mapa-resumo" className="flex flex-col gap-3">
        <h2 id="mapa-resumo" className="text-xl font-semibold">
          Mapa dos bairros da sede
        </h2>
        <p className="max-w-3xl text-muted-foreground">
          Clique em um bairro para abrir o Território com ele selecionado.
        </p>
        <MapaResumo bairros={bairros} limite={limite} />
      </section>

      <section aria-labelledby="atalhos" className="flex flex-col gap-3">
        <h2 id="atalhos" className="text-xl font-semibold">
          Explore os módulos
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULOS.map((modulo) => {
            const Icone = modulo.icone
            return (
              <li key={modulo.id}>
                <Link
                  href={modulo.rota}
                  className="flex h-full flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Icone aria-hidden className="size-5 text-primary" />
                    {modulo.rotulo}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {modulo.descricao}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
