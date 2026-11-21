import type {
  DestinoNome,
  ProblemaLinha,
} from "@/lib/importacao/tipos-importacao"
import type { LinhaAnalisada } from "@/lib/importacao/validar-linhas"

// Duplicata depois da correspondência (RF-02.15, RN-02.06, DEC-T-12): `Centro` e `CENTRO` no mesmo período são a
// mesma linha. Fora da cobertura não tem `bairroId`, então a chave é o nome normalizado.

function chaveDaLinha(
  linha: LinhaAnalisada,
  destino: DestinoNome | null
): string | null {
  if (destino === null || linha.periodo === null) return null
  const lugar =
    destino.tipo === "bairro"
      ? `bairro:${destino.bairroId}`
      : `fora:${linha.nomeNormalizado}`
  return `${lugar}|${linha.periodo.periodo}`
}

/** Uma duplicata por chave repetida, com todas as linhas envolvidas. Nome pendente ainda não entra. */
export function detectarDuplicatas(
  linhas: readonly LinhaAnalisada[],
  destinoPorNome: ReadonlyMap<string, DestinoNome | null>
): ProblemaLinha[] {
  const linhasPorChave = new Map<string, number[]>()
  for (const linha of linhas) {
    const chave = chaveDaLinha(
      linha,
      destinoPorNome.get(linha.nomeNormalizado) ?? null
    )
    if (chave === null) continue
    const numeros = linhasPorChave.get(chave)
    if (numeros) numeros.push(linha.numero)
    else linhasPorChave.set(chave, [linha.numero])
  }
  return [...linhasPorChave.values()]
    .filter((numeros) => numeros.length > 1)
    .map((numeros) => ({
      linhas: numeros,
      codigo: "DUPLICATA",
      severidade: "erro",
    }))
}
