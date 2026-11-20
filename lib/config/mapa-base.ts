// Fundo de mapa (TechSpec EP-01 §6): raster público do OpenStreetMap, sem chave nem custo. Trocar de provedor é
// mudar só este arquivo. O fundo é contexto visual: não entra em cálculo (RN-01.07).
export const MAPA_BASE = {
  urlTiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  hostTiles: "tile.openstreetmap.org",
  tamanhoTile: 256,
  zoomMaximo: 19,
  atribuicao: "© OpenStreetMap contributors",
} as const
