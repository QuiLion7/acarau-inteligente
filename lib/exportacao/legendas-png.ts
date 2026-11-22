import type { ClassesCoropletico } from "@/lib/saude/classes-coropletico"
import { FORMA_MARCADOR_OBRA, SITUACOES_OBRA } from "@/lib/obras/situacao-obra"
import {
  CORES_COROPLETICO,
  CORES_MAPA,
  ESTADOS_COM_MARCADOR,
  ICONES_ESCOLA,
  ICONES_OBRA,
} from "@/lib/territorio/estilo-mapa"

// Itens de legenda do PNG do mapa (TechSpec EP-05 §2, DV-20, RN-029): os mesmos rótulos, formas e cores das legendas em
// HTML de cada tela, então o PNG diz o que a tela diz. Cada item tem forma e texto: nenhum depende só da cor.

export type FormaLegenda =
  "quadrado" | "circulo" | "triangulo" | "losango" | "tracejado" | "hachura"

export type ItemLegendaPng = {
  forma: FormaLegenda
  cor: string
  rotulo: string
}

export const ROTULO_BAIRRO = "Bairro da sede (Unidade de Vizinhança)"
export const ROTULO_BAIRRO_SELECIONADO = "Bairro selecionado (contorno grosso)"
export const ROTULO_LIMITE = "Limite municipal (tracejado)"
export const ROTULO_ZERO = "Zero informado (0 casos)"
export const ROTULO_SEM_DADOS = "Sem dados"

/** Bairros, o selecionado (se houver) e o limite: a base das legendas de Território, Educação e Obras. */
export function legendaDosBairros(
  comBairroSelecionado: boolean,
  comLimite = true
): ItemLegendaPng[] {
  return [
    { forma: "quadrado", cor: CORES_MAPA.bairro, rotulo: ROTULO_BAIRRO },
    ...(comBairroSelecionado
      ? [
          {
            forma: "quadrado" as const,
            cor: CORES_MAPA.bairroSelecionado,
            rotulo: ROTULO_BAIRRO_SELECIONADO,
          },
        ]
      : []),
    ...(comLimite
      ? [
          {
            forma: "tracejado" as const,
            cor: CORES_MAPA.limite,
            rotulo: ROTULO_LIMITE,
          },
        ]
      : []),
  ]
}

/** Os três estados de escola com marcador, com a forma e o rótulo do mapa. */
export function legendaDasEscolas(): ItemLegendaPng[] {
  return ESTADOS_COM_MARCADOR.map((estado) => {
    const { forma, cor, rotulo } = ICONES_ESCOLA[estado]
    return { forma, cor, rotulo }
  })
}

/** As quatro situações de obra, cada uma com a forma de marcador que o mapa usa. */
export function legendaDasObras(): ItemLegendaPng[] {
  return SITUACOES_OBRA.map((situacao) => ({
    forma: FORMA_MARCADOR_OBRA[situacao],
    cor: ICONES_OBRA[situacao].cor,
    rotulo: ICONES_OBRA[situacao].rotulo,
  }))
}

/** Classes do coroplético, "zero informado", "sem dados" e, com bairro filtrado, o contorno grosso. */
export function legendaDoCoropletico(
  classes: ClassesCoropletico,
  comBairroSelecionado: boolean
): ItemLegendaPng[] {
  return [
    ...classes.classes.map(({ indice, rotulo }) => ({
      forma: "quadrado" as const,
      cor: CORES_COROPLETICO[indice - 1],
      rotulo,
    })),
    {
      forma: "tracejado",
      cor: CORES_MAPA.bordaCoropletico,
      rotulo: ROTULO_ZERO,
    },
    {
      forma: "hachura",
      cor: CORES_MAPA.bordaCoropletico,
      rotulo: ROTULO_SEM_DADOS,
    },
    ...(comBairroSelecionado
      ? [
          {
            forma: "quadrado" as const,
            cor: CORES_MAPA.bairroSelecionado,
            rotulo: ROTULO_BAIRRO_SELECIONADO,
          },
        ]
      : []),
  ]
}
