// Rotas percorridas pelos E2E de rotas (E2E-02) e de 360 px (E2E-07).
export const ROTAS_PUBLICAS = [
  "/",
  "/territorio",
  "/saude",
  "/educacao",
  "/obras",
  "/relatorios",
  "/fontes",
  "/sobre",
  "/entrar",
] as const

// Abertas como administrador, que tem acesso às duas.
export const ROTAS_LOGADAS = ["/analista", "/admin"] as const

export const ROTA_INEXISTENTE = "/rota-que-nao-existe"

// O Chromium registra no console o 404 do próprio documento; é o único erro esperado na rota inexistente.
export const ERRO_DE_CONSOLE_DO_404 = /status of 404/
