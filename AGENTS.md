# Acaraú Inteligente - convenções do repositório

Responder sempre em português do Brasil.

Antes de planejar ou escrever código, leia `sdd/decisoes.md` e as rules de `.claude/rules/` que se aplicam ao arquivo (valem para qualquer IA):

- `code-standards.md`: qualidade TypeScript.
- `test.md`: testes (Jest, Playwright, gate de cobertura, `npm run verificar`).
- `seguranca.md`: autorização no servidor, sessão, log, segredos.
- `react-next.md`: React/Next 16, TanStack Query/Form/Table, shadcn `base-maia`.
- `folder-structure.md`: onde cada arquivo mora (raiz sem `src/`).

Código de produção novo ou alterado exige teste conforme `test.md`. Os artefatos de cada épico ficam em `sdd/<épico>/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
