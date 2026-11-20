// Contas só do servidor do E2E (porta 3100, banco acarau_e2e). Não são credenciais reais:
// valem apenas no `next start` que o playwright.config.ts sobe com os hashes gerados na hora.
export const CONTAS_DE_TESTE = {
  analista: {
    usuario: "analista-e2e",
    nome: "Analista Demo",
    senha: "senha-de-teste-e2e",
  },
  administrador: {
    usuario: "admin-e2e",
    nome: "Administrador Demo",
    senha: "senha-de-teste-e2e-admin",
  },
} as const
