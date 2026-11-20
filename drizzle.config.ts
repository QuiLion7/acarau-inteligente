import { defineConfig } from "drizzle-kit"

// `npm run db:gerar` gera a migração a partir do schema; quem aplica é scripts/migrar.mjs.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/server/db/schema.ts",
  out: "./db/migracoes",
})
