"use client"

import type { Map as MapaMapLibre } from "maplibre-gl"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { baixarBlob } from "@/lib/exportacao/baixar-arquivo"
import { capturarMapa, comporImagemMapa } from "@/lib/exportacao/mapa-png"
import type { MolduraPng } from "@/lib/exportacao/moldura-png"
import { nomeArquivo } from "@/lib/relatorios/nome-arquivo"

const ROTULO = "Baixar mapa (PNG)"
const MENSAGEM_DE_ERRO = "Não foi possível baixar o mapa. Tente de novo."

type BotaoBaixarMapaProps = {
  /** A instância do MapLibre (`aoCarregar` do mapa); `null` até o mapa carregar, e o botão fica desabilitado. */
  mapa: MapaMapLibre | null
  moldura: MolduraPng
  /** O que o arquivo é, para o nome: "mapa-saude"... */
  tipo: string
  bairro?: string | null
}

// Baixa o enquadramento atual do mapa como PNG, com título, filtros, legenda, atribuição e selos (RF-05.22). Gerado no
// navegador, sem endpoint; sem o fundo do OpenStreetMap a imagem sai com o fundo neutro e as camadas (RF-05.23).
export function BotaoBaixarMapa({
  mapa,
  moldura,
  tipo,
  bairro,
}: BotaoBaixarMapaProps) {
  const [gerando, setGerando] = useState(false)

  async function handleBaixar() {
    if (!mapa) return
    setGerando(true)
    try {
      const agora = new Date()
      const captura = await capturarMapa(mapa)
      const blob = await comporImagemMapa(captura, moldura, agora)
      baixarBlob(
        blob,
        nomeArquivo({ tipo, data: agora, bairro, extensao: "png" })
      )
    } catch (erro) {
      if (process.env.NODE_ENV !== "production") console.error(erro)
      toast.error(MENSAGEM_DE_ERRO)
    } finally {
      setGerando(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={mapa === null || gerando}
      onClick={handleBaixar}
    >
      {ROTULO}
    </Button>
  )
}
