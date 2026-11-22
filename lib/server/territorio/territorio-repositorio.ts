import "server-only"

import territorioGerado from "@/dados/gerados/territorio.json"
import {
  artefatoTerritorioSchema,
  type BairroResumo,
  type DadosMapaResumo,
  type DadosTerritorio,
} from "@/lib/territorio/artefato-schema"

// Leitura do território gerado pela carga (DV-17): é a abstração que isola o formato de armazenamento;
// trocar o JSON por outro banco muda só este arquivo.
export class ArtefatoTerritorioInvalidoErro extends Error {
  constructor(options?: ErrorOptions) {
    super(
      "O artefato de território (dados/gerados/territorio.json) não confere com o schema; rode `npm run dados:territorio`.",
      options
    )
    this.name = "ArtefatoTerritorioInvalidoErro"
  }
}

export type RepositorioTerritorio = {
  listarResumoBairros(): BairroResumo[]
  obterDadosTerritorio(): DadosTerritorio
  obterDadosMapaResumo(): DadosMapaResumo
  resolverIdBairro(id: string): BairroResumo | null
}

/** Valida o artefato uma vez (Zod) e devolve as consultas; artefato fora do schema lança erro nomeado. */
export function criarRepositorioTerritorio(
  artefatoBruto: unknown
): RepositorioTerritorio {
  const resultado = artefatoTerritorioSchema.safeParse(artefatoBruto)
  if (!resultado.success) {
    throw new ArtefatoTerritorioInvalidoErro({ cause: resultado.error })
  }
  const { regraFronteira, bairros, limite, escolas, qualidade } = resultado.data
  const resumos = bairros.map(({ id, uv, nome, nomeLei }) => ({
    id,
    uv,
    nome,
    nomeLei,
  }))
  return {
    listarResumoBairros: () => resumos,
    obterDadosTerritorio: () => ({
      regraFronteira,
      bairros,
      limite,
      escolas,
      qualidade,
    }),
    obterDadosMapaResumo: () => ({ bairros, limite }),
    resolverIdBairro: (id) =>
      resumos.find((resumo) => resumo.id === id) ?? null,
  }
}

let repositorio: RepositorioTerritorio | undefined

function repositorioDoArtefato(): RepositorioTerritorio {
  repositorio ??= criarRepositorioTerritorio(territorioGerado)
  return repositorio
}

export function listarResumoBairros(): BairroResumo[] {
  return repositorioDoArtefato().listarResumoBairros()
}

export function obterDadosTerritorio(): DadosTerritorio {
  return repositorioDoArtefato().obterDadosTerritorio()
}

export function obterDadosMapaResumo(): DadosMapaResumo {
  return repositorioDoArtefato().obterDadosMapaResumo()
}

export function resolverIdBairro(id: string): BairroResumo | null {
  return repositorioDoArtefato().resolverIdBairro(id)
}
