"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const ABAS = ["mapa", "tabela"] as const
type Aba = (typeof ABAS)[number]

function ehAba(valor: unknown): valor is Aba {
  return ABAS.some((aba) => aba === valor)
}

type AbasAnaliseProps = {
  mapa: ReactNode
  tabela: ReactNode
}

// Abas Mapa e Tabela da análise (RF-03.08, RF-03.10, DEC-T-10): a tabela é a alternativa completa ao mapa (RN-023).
// O painel de uma aba só existe enquanto ela está ativa; ao ativá-la o foco vai ao painel. As setas só percorrem as abas (a ativação é por Enter ou Espaço) e não roubam o foco.
export function AbasAnalise({ mapa, tabela }: AbasAnaliseProps) {
  const [aba, setAba] = useState<Aba>("mapa")
  const focoNoPainelPendenteRef = useRef(false)
  const painelRef = useRef<HTMLDivElement>(null)

  function handleTrocarAba(valor: unknown) {
    if (!ehAba(valor)) return
    focoNoPainelPendenteRef.current = true
    setAba(valor)
  }

  // Sincroniza o foco do DOM com a aba que acabou de ser ativada pelo usuário; a troca inicial não rouba o foco.
  useEffect(() => {
    if (!focoNoPainelPendenteRef.current) return
    focoNoPainelPendenteRef.current = false
    painelRef.current?.focus()
  }, [aba])

  return (
    <Tabs value={aba} onValueChange={handleTrocarAba} className="min-w-0">
      <TabsList>
        <TabsTrigger value="mapa">Mapa</TabsTrigger>
        <TabsTrigger value="tabela">Tabela</TabsTrigger>
      </TabsList>
      <TabsContent value="mapa" ref={painelRef} tabIndex={-1} className="pt-2">
        {mapa}
      </TabsContent>
      <TabsContent
        value="tabela"
        ref={painelRef}
        tabIndex={-1}
        className="pt-2"
      >
        {tabela}
      </TabsContent>
    </Tabs>
  )
}
