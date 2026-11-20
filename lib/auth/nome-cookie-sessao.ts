// Nome do cookie de sessão. Fica fora de `lib/server/` porque o `proxy.ts` também confere se ele existe
// (checagem otimista) e não pode importar módulo `server-only`; só `lib/server/auth/` lê ou grava o valor.
export const NOME_COOKIE_SESSAO = "acarau_sessao"
