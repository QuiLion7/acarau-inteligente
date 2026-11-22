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
  "./lib/filtros/filtros-url.ts": { lines: 80, branches: 80 },
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
  "./lib/server/territorio/territorio-repositorio.ts": {
    lines: 80,
    branches: 80,
  },
  "./lib/territorio/geopackage.ts": { lines: 80, branches: 80 },
  "./lib/territorio/projecao.ts": { lines: 80, branches: 80 },
  "./lib/territorio/geometria.ts": { lines: 80, branches: 80 },
  "./lib/territorio/atribuicao-ponto.ts": { lines: 80, branches: 80 },
  "./lib/territorio/nome-bairro.ts": { lines: 80, branches: 80 },
  "./lib/territorio/validacao-carga.ts": { lines: 80, branches: 80 },
  "./lib/territorio/montar-territorio.ts": { lines: 80, branches: 80 },
  "./lib/territorio/ler-csv.ts": { lines: 80, branches: 80 },
  "./lib/territorio/busca-bairros.ts": { lines: 80, branches: 80 },
  "./lib/territorio/formato.ts": { lines: 80, branches: 80 },
  "./lib/territorio/estilo-mapa.ts": { lines: 80, branches: 80 },
  "./lib/territorio/imagens-mapa.ts": { lines: 80, branches: 80 },
  "./lib/territorio/geojson-mapa.ts": { lines: 80, branches: 80 },
  "./lib/territorio/filtro-escolas.ts": { lines: 80, branches: 80 },
  "./lib/territorio/estado-escola.ts": { lines: 80, branches: 80 },
  "./lib/importacao/decodificar-arquivo.ts": { lines: 80, branches: 80 },
  "./lib/importacao/ler-csv-estrito.ts": { lines: 80, branches: 80 },
  "./lib/importacao/dado-pessoal.ts": { lines: 80, branches: 80 },
  "./lib/importacao/ler-arquivo-csv.ts": { lines: 80, branches: 80 },
  "./lib/importacao/mapeamento-colunas.ts": { lines: 80, branches: 80 },
  "./lib/importacao/valores.ts": { lines: 80, branches: 80 },
  "./lib/importacao/correspondencia-bairros.ts": { lines: 80, branches: 80 },
  "./lib/importacao/validar-linhas.ts": { lines: 80, branches: 80 },
  "./lib/importacao/duplicatas.ts": { lines: 80, branches: 80 },
  "./lib/importacao/analisar-importacao.ts": { lines: 80, branches: 80 },
  "./lib/importacao/mensagens.ts": { lines: 80, branches: 80 },
  "./lib/importacao/montar-relatorio.ts": { lines: 80, branches: 80 },
  "./lib/importacao/relatorio-schema.ts": { lines: 80, branches: 80 },
  "./lib/importacao/hash-conteudo.ts": { lines: 80, branches: 80 },
  "./lib/server/datasets/dataset-linha-repositorio.ts": {
    lines: 80,
    branches: 80,
  },
  "./lib/server/datasets/dataset-repositorio.ts": { lines: 80, branches: 80 },
  "./lib/server/datasets/importacao-servico.ts": { lines: 80, branches: 80 },
  "./lib/server/datasets/analise-dataset-servico.ts": {
    lines: 80,
    branches: 80,
  },
  "./lib/server/datasets/publicacao-servico.ts": { lines: 80, branches: 80 },
  "./lib/server/datasets/ler-id-versao.ts": { lines: 80, branches: 80 },
  "./lib/server/datasets/ler-requisicao-importacao.ts": {
    lines: 80,
    branches: 80,
  },
  "./lib/server/datasets/log-importacao.ts": { lines: 80, branches: 80 },
  "./lib/server/demo/dataset-pre-carregado.ts": { lines: 80, branches: 80 },
  "./lib/server/demo/reset-servico.ts": { lines: 80, branches: 80 },
  "./lib/saude/analise-periodo.ts": { lines: 80, branches: 80 },
  "./lib/saude/variacao-periodo.ts": { lines: 80, branches: 80 },
  "./lib/saude/classes-coropletico.ts": { lines: 80, branches: 80 },
  "./lib/saude/ranking.ts": { lines: 80, branches: 80 },
  "./lib/saude/serie-temporal.ts": { lines: 80, branches: 80 },
  "./lib/saude/opcao-grafico.ts": { lines: 80, branches: 80 },
  "./lib/obras/situacao-obra.ts": { lines: 80, branches: 80 },
  "./lib/obras/localizacao-obra.ts": { lines: 80, branches: 80 },
  "./lib/obras/valores-obra.ts": { lines: 80, branches: 80 },
  "./lib/obras/filtro-obras.ts": { lines: 80, branches: 80 },
  "./lib/obras/apresentacao-obra.ts": { lines: 80, branches: 80 },
  "./lib/obras/formulario-obra.ts": { lines: 80, branches: 80 },
  "./lib/validations/obra-schema.ts": { lines: 80, branches: 80 },
  "./lib/server/obras/obra-repositorio.ts": { lines: 80, branches: 80 },
  "./lib/server/obras/obra-servico.ts": { lines: 80, branches: 80 },
  "./lib/server/obras/obras-pre-carregadas.ts": { lines: 80, branches: 80 },
  "./lib/server/obras/ler-entrada-obra.ts": { lines: 80, branches: 80 },
  "./lib/server/obras/log-obra.ts": { lines: 80, branches: 80 },
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
      // Só tipos: não há o que cobrir.
      "!lib/territorio/insumos-carga.ts",
      "!lib/importacao/tipos-importacao.ts",
      "!lib/saude/analise-dataset.ts",
      "!lib/importacao/__fixtures__/**",
      "!lib/obras/__fixtures__/**",
      "!**/*.test.{ts,tsx}",
      "!**/*.d.ts",
    ],
    coverageThreshold,
  }
}

export default configurar
