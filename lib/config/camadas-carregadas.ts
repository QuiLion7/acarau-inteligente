// Camadas de dados já carregadas (RN-005, DV-10): "Fontes e limitações" lista só o que consta aqui.
// Vazia no EP-00; cada épico de dados acrescenta a camada no mesmo commit em que a carrega.
export type CamadaCarregada = {
  id: string
  nome: string
  fonte: string
  versao: string
}

export const CAMADAS_CARREGADAS: readonly CamadaCarregada[] = []
