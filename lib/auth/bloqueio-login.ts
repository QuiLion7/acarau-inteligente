// Bloqueio de login por usuário (RF-00.29, DV-14): função pura, o relógio entra por parâmetro.
export type TentativaRecente = { sucesso: boolean; ocorridaEm: Date }

export type LimitesBloqueio = {
  maxFalhas: number
  janelaMin: number
  bloqueioMin: number
}

export type AvaliacaoBloqueio =
  { bloqueado: false } | { bloqueado: true; esperaMinutos: number }

const MS_POR_MINUTO = 60_000

// Quem consulta o banco pede as tentativas a partir deste instante: um bloqueio ainda ativo nasceu de uma
// falha de até `bloqueioMin` atrás, e ela só conta com as falhas da janela anterior a ela.
export function inicioDaConsulta(agora: Date, limites: LimitesBloqueio): Date {
  const alcanceMin = limites.janelaMin + limites.bloqueioMin
  return new Date(agora.getTime() - alcanceMin * MS_POR_MINUTO)
}

// Falha que completou `maxFalhas` falhas dentro da janela (contada até ela, inclusive) dispara o bloqueio, que dura
// `bloqueioMin` a partir dela e vale também para quem acerta a senha. Um sucesso zera as falhas anteriores.
export function avaliarBloqueio(
  tentativas: readonly TentativaRecente[],
  agora: Date,
  limites: LimitesBloqueio
): AvaliacaoBloqueio {
  const recentes = tentativas.toSorted(
    (a, b) => b.ocorridaEm.getTime() - a.ocorridaEm.getTime()
  )
  const ultimoSucesso = recentes.findIndex((tentativa) => tentativa.sucesso)
  const falhas = (
    ultimoSucesso === -1 ? recentes : recentes.slice(0, ultimoSucesso)
  ).map((tentativa) => tentativa.ocorridaEm.getTime())
  // `falhas` está da mais recente para a mais antiga: a que fecha um grupo de `maxFalhas` vem antes das outras.
  const janelaMs = limites.janelaMin * MS_POR_MINUTO
  const disparadora = falhas.find(
    (instante, posicao) =>
      posicao + limites.maxFalhas <= falhas.length &&
      instante - falhas[posicao + limites.maxFalhas - 1] <= janelaMs
  )
  if (disparadora === undefined) return { bloqueado: false }

  const fimDoBloqueio = disparadora + limites.bloqueioMin * MS_POR_MINUTO
  if (agora.getTime() >= fimDoBloqueio) return { bloqueado: false }
  return {
    bloqueado: true,
    esperaMinutos: Math.ceil((fimDoBloqueio - agora.getTime()) / MS_POR_MINUTO),
  }
}
