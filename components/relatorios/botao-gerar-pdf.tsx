"use client"

import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { TEXTOS_RELATORIOS } from "@/lib/config/textos-relatorios"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import type { RelatorioDados } from "@/lib/relatorios/tipos-relatorio"

const TEXTOS = TEXTOS_RELATORIOS.pdf

// O módulo do PDF (`@react-pdf/renderer` e o documento) só entra no clique, ou numa pré-carga ao passar o mouse ou focar
// o botão (R-02): o bundle inicial de `/relatorios` não o leva.
const carregarGeradorDePdf = () =>
  import("@/components/relatorios/pdf/gerar-pdf")

type Estado = "parado" | "gerando" | "erro"

// Estado do botão é UI local, não dado de servidor (TechSpec §12): nada de TanStack Query aqui.
export function BotaoGerarPdf({ dados }: { dados: RelatorioDados }) {
  const [estado, setEstado] = useState<Estado>("parado")

  function handlePreCarregar() {
    // A pré-carga é só uma antecipação: se falhar, o clique tenta de novo e mostra o erro recuperável.
    void carregarGeradorDePdf().catch(() => undefined)
  }

  async function handleGerar() {
    setEstado("gerando")
    try {
      const { gerarPdfRelatorio } = await carregarGeradorDePdf()
      const { blob, nome } = await gerarPdfRelatorio(dados, new Date())
      baixarBlob(blob, nome)
      setEstado("parado")
    } catch (erro) {
      // A falha acontece no navegador e não passa pelo servidor: a causa fica no console de desenvolvimento e a tela
      // mostra só a mensagem recuperável (CA-05.08, TechSpec §10).
      if (process.env.NODE_ENV !== "production") console.error(erro)
      setEstado("erro")
    }
  }

  const gerando = estado === "gerando"
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={gerando}
          onClick={handleGerar}
          onMouseEnter={handlePreCarregar}
          onFocus={handlePreCarregar}
        >
          {gerando ? (
            <>
              <Spinner /> {TEXTOS.gerando}
            </>
          ) : (
            TEXTOS.gerar
          )}
        </Button>
      </div>
      {estado === "erro" ? (
        <Alert role="alert">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {TEXTOS.erro}
            <Button type="button" variant="outline" onClick={handleGerar}>
              {TEXTOS.tentarDeNovo}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
