import { Text, View } from "@react-pdf/renderer"
import type { ReactNode } from "react"

import { estilos } from "@/components/relatorios/pdf/estilos-pdf"
import { dividirEmBlocos } from "@/lib/relatorios/blocos-tabela"

// Peças de layout do PDF: títulos, avisos, dados, listas e tabela em blocos. Primitivas do `@react-pdf/renderer`, não o
// design system (TechSpec §12). O texto de dados entra como texto, nunca como marcação.

export function SecaoPdf({
  titulo,
  children,
}: {
  titulo: string
  children: ReactNode
}) {
  return (
    <View style={estilos.secao}>
      <Text style={estilos.h2} minPresenceAhead={80}>
        {titulo}
      </Text>
      {children}
    </View>
  )
}

export function SubtituloPdf({ children }: { children: string }) {
  return (
    <Text style={estilos.h3} minPresenceAhead={60}>
      {children}
    </Text>
  )
}

export function ParagrafoPdf({
  children,
  suave = false,
  negrito = false,
}: {
  children: string
  suave?: boolean
  negrito?: boolean
}) {
  return (
    <Text
      style={[
        estilos.paragrafo,
        suave ? estilos.suave : {},
        negrito ? estilos.negrito : {},
      ]}
    >
      {children}
    </Text>
  )
}

export function AvisoPdf({ children }: { children: string }) {
  return (
    <View style={estilos.aviso} wrap={false}>
      <Text>{children}</Text>
    </View>
  )
}

export function DadosPdf({
  itens,
}: {
  itens: readonly (readonly [string, string])[]
}) {
  return (
    <View style={{ marginBottom: 4 }}>
      {itens.map(([rotulo, valor]) => (
        <View key={rotulo} style={estilos.dados} wrap={false}>
          <Text style={estilos.dadosRotulo}>{rotulo}</Text>
          <Text style={estilos.dadosValor}>{valor}</Text>
        </View>
      ))}
    </View>
  )
}

export function ListaPdf({ itens }: { itens: readonly string[] }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {itens.map((item, indice) => (
        <View key={`${indice}-${item}`} style={estilos.item} wrap={false}>
          <Text style={estilos.marcador}>-</Text>
          <Text style={estilos.itemTexto}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

export function CartaoPdf({
  titulo,
  valor,
  linhas = [],
}: {
  titulo: string
  valor?: string
  linhas?: readonly string[]
}) {
  return (
    <View style={estilos.cartao} wrap={false}>
      <Text style={estilos.cartaoTitulo}>{titulo}</Text>
      {valor !== undefined ? (
        <Text style={estilos.cartaoValor}>{valor}</Text>
      ) : null}
      {linhas.map((linha) => (
        <Text key={linha} style={estilos.suave}>
          {linha}
        </Text>
      ))}
    </View>
  )
}

export function CartoesPdf({ children }: { children: ReactNode }) {
  return <View style={estilos.cartoes}>{children}</View>
}

export type ColunaPdf = { titulo: string; largura: number }

// Tabela em blocos de 25 linhas (RF-05.16): cada bloco repete o cabeçalho e não se parte entre páginas.
export function TabelaPdf({
  colunas,
  linhas,
}: {
  colunas: readonly ColunaPdf[]
  linhas: readonly (readonly string[])[]
}) {
  return (
    <View>
      {dividirEmBlocos(linhas).map((bloco, indiceDoBloco) => (
        <View key={indiceDoBloco} style={estilos.tabela} wrap={false}>
          <View style={estilos.tabelaCabecalho}>
            {colunas.map(({ titulo, largura }) => (
              <Text
                key={titulo}
                style={[
                  estilos.celula,
                  estilos.celulaCabecalho,
                  { flex: largura },
                ]}
              >
                {titulo}
              </Text>
            ))}
          </View>
          {bloco.map((linha, indice) => (
            <View
              key={`${indiceDoBloco}-${indice}`}
              style={estilos.tabelaLinha}
            >
              {linha.map((valor, coluna) => (
                <Text
                  key={colunas[coluna]?.titulo ?? coluna}
                  style={[
                    estilos.celula,
                    { flex: colunas[coluna]?.largura ?? 1 },
                  ]}
                >
                  {valor}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}
