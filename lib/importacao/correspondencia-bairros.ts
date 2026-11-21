import type {
  CorrespondenciaNome,
  DecisaoBairro,
  DestinoNome,
} from "@/lib/importacao/tipos-importacao"
import type { BairroResumo } from "@/lib/territorio/artefato-schema"
import { buscarBairros, CODIGO_UV } from "@/lib/territorio/busca-bairros"
import { normalizarParaBusca } from "@/lib/territorio/nome-bairro"

// Correspondência de nome de bairro do CSV com as 24 UVs (RF-02.08 a RF-02.11, DEC-T-04). Igualdade normalizada ou
// código de UV é automática; trecho de nome é ambíguo e exige confirmação; sem distância de edição (falso positivo).

function igualAoNome(normalizado: string, bairro: BairroResumo): boolean {
  return [bairro.nome, bairro.nomeLei].some(
    (nome) => normalizarParaBusca(nome) === normalizado
  )
}

function reconhecido(bairro: BairroResumo): CorrespondenciaNome {
  return { estado: "reconhecido", bairroId: bairro.id, origem: "automatica" }
}

export function corresponderNome(
  nomeOriginal: string,
  bairros: readonly BairroResumo[]
): CorrespondenciaNome {
  const normalizado = normalizarParaBusca(nomeOriginal)
  if (normalizado === "") return { estado: "nao-reconhecido" }

  if (CODIGO_UV.test(normalizado)) {
    const [porCodigo] = buscarBairros(bairros, normalizado)
    return porCodigo ? reconhecido(porCodigo) : { estado: "nao-reconhecido" }
  }

  const iguais = bairros.filter((bairro) => igualAoNome(normalizado, bairro))
  const [unico] = iguais
  if (unico && iguais.length === 1) return reconhecido(unico)

  const candidatos =
    iguais.length > 1 ? iguais : buscarBairros(bairros, normalizado)
  return candidatos.length > 0
    ? { estado: "ambiguo", candidatos }
    : { estado: "nao-reconhecido" }
}

/** Decisão que vale: a última do nome; `bairroId` fora dos 24 é ignorado e o nome continua pendente. */
export function decisaoValida(
  nomeNormalizado: string,
  decisoes: readonly DecisaoBairro[],
  bairros: readonly BairroResumo[]
): DecisaoBairro | null {
  const dele = decisoes.filter(
    (decisao) => decisao.nomeNormalizado === nomeNormalizado
  )
  const ultima = dele.at(-1)
  if (!ultima) return null
  if (ultima.tipo === "fora-da-cobertura") return ultima
  return bairros.some(({ id }) => id === ultima.bairroId) ? ultima : null
}

/** Reconhecido segue sozinho; ambíguo e não reconhecido dependem da decisão (RF-02.09, RF-02.10). */
export function resolverDestino(
  correspondencia: CorrespondenciaNome,
  decisao: DecisaoBairro | null
): DestinoNome | null {
  if (correspondencia.estado === "reconhecido") {
    return {
      tipo: "bairro",
      bairroId: correspondencia.bairroId,
      origem: "automatica",
    }
  }
  if (!decisao) return null
  return decisao.tipo === "bairro"
    ? { tipo: "bairro", bairroId: decisao.bairroId, origem: "manual" }
    : { tipo: "fora-da-cobertura", origem: "manual" }
}
