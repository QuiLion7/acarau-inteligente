import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const comum = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  restoreMocks: true,
  moduleNameMapper: {
    // O alias precisa estar aqui também: sem ele o `--findRelatedTests` não acha os testes de um arquivo.
    "^@/(.*)$": "<rootDir>/$1",
    "^server-only$": "<rootDir>/test/server-only-vazio.ts",
  },
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/tests/",
  ],
}

const projetos = [
  {
    ...comum,
    displayName: "unidade",
    testEnvironment: "node",
    testMatch: ["<rootDir>/**/*.test.ts"],
    // A negação no testMatch não exclui nada; sem isto os `*.int.test.ts` rodariam também neste projeto.
    testPathIgnorePatterns: [
      ...comum.testPathIgnorePatterns,
      "\\.int\\.test\\.ts$",
    ],
  },
  {
    ...comum,
    displayName: "unidade-ui",
    testEnvironment: "jsdom",
    testMatch: ["<rootDir>/**/*.test.tsx"],
  },
  {
    // Postgres do compose, banco `acarau_teste` (npm run db:preparar-teste).
    ...comum,
    displayName: "integracao",
    testEnvironment: "node",
    testMatch: ["<rootDir>/**/*.int.test.ts"],
    testTimeout: 30000,
  },
]

// Gate por arquivo (test.md §1, §21): cada entrada aponta para arquivo que existe.
const coverageThreshold = {
  "./lib/config/ambiente.ts": { lines: 80, branches: 80 },
  "./lib/auth/senha.ts": { lines: 80, branches: 80 },
  "./lib/auth/papeis.ts": { lines: 80, branches: 80 },
  "./lib/auth/contas-demo.ts": { lines: 80, branches: 80 },
  "./lib/auth/bloqueio-login.ts": { lines: 80, branches: 80 },
  "./lib/auth/caminho-retorno.ts": { lines: 80, branches: 80 },
  "./lib/server/auth/cookie-sessao.ts": { lines: 80, branches: 80 },
  "./lib/server/auth/sessao-repositorio.ts": { lines: 80, branches: 80 },
  "./lib/server/auth/tentativa-login-repositorio.ts": {
    lines: 80,
    branches: 80,
  },
  "./lib/server/auth/sessao-servico.ts": { lines: 80, branches: 80 },
  "./lib/server/auth/login-servico.ts": { lines: 80, branches: 80 },
  "./lib/server/auth/dal.ts": { lines: 80, branches: 80 },
  "./lib/server/http/erro-api.ts": { lines: 80, branches: 80 },
  "./lib/server/http/origem.ts": { lines: 80, branches: 80 },
  "./lib/server/http/request-id.ts": { lines: 80, branches: 80 },
  "./lib/server/http/rota-api.ts": { lines: 80, branches: 80 },
  "./lib/server/log.ts": { lines: 80, branches: 80 },
}

// `projects` precisa de cada projeto passado pelo next/jest (SWC, alias, mocks de CSS e fonte).
async function configurar() {
  return {
    projects: await Promise.all(
      projetos.map((projeto) => createJestConfig(projeto)())
    ),
    // Serial de propósito: os testes de integração compartilham o banco `acarau_teste`.
    maxWorkers: 1,
    coverageProvider: "v8",
    collectCoverageFrom: [
      "lib/**/*.{ts,tsx}",
      "!lib/utils.ts",
      "!**/*.test.{ts,tsx}",
      "!**/*.d.ts",
    ],
    coverageThreshold,
  }
}

export default configurar
