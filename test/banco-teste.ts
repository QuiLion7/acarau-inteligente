import { sql } from "drizzle-orm"

import { BANCO_TESTE, urlDoBanco } from "@/scripts/url-banco.mjs"
import { criarBanco, type Banco } from "@/lib/server/db/cliente"

// Banco de integração, nunca o da aplicação (seguranca.md §15). Exige `npm run db:preparar-teste`.
export function criarBancoDeTeste(): Banco {
  return criarBanco(urlDoBanco(BANCO_TESTE))
}

// TRUNCATE entre testes (test.md §12): cada teste prepara o próprio estado.
export async function limparTabelas(banco: Banco): Promise<void> {
  await banco.execute(
    sql`truncate table sessao, tentativa_login, dataset, dataset_versao, dataset_linha, obra, obra_historico restart identity`
  )
}
