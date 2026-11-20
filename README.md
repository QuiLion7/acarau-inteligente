# Acaraú Inteligente — Demonstração Independente

Aplicação web de demonstração que transforma dados territoriais e setoriais agregados de Acaraú (CE) em mapas, indicadores e relatórios com procedência explícita. **Não é sistema oficial da Prefeitura.**

## Comece aqui

1. Leia `docs/00_MASTER_SPEC_DEMO.md` — requisitos, regras de negócio, jornadas, APIs, critérios de aceitação, riscos, segurança e escopo. É a fonte de verdade, **não é um PRD**.
2. Leia `docs/01_PLANO_SDD.md` — épicos, dependências, gates e uso das skills.
3. Leia `docs/02_ROTEIRO_COMERCIAL_E_CENARIOS.md` — demonstração e descoberta comercial.
4. Leia `dados/LEIA-ME.txt` — inventário das camadas, fontes, SRC e problemas conhecidos dos arquivos.
5. Os artefatos de cada épico (PRD, TechSpec, tarefas, QA e revisão) ficam em `sdd/<épico>/`, neste repositório.

## Estado atual

| Épico | Situação |
|---|---|
| EP-00 Fundação | Implementado (`sdd/ep-00-fundacao/tasks.md`): infraestrutura, banco, contrato de API, testes, casca, páginas públicas e acesso por papel; falta a revisão e o roteiro manual de `sdd/ep-00-fundacao/qa-report.md` |
| EP-01 Território e escolas | Implementado (`sdd/ep-01-territorio-escolas/tasks.md`): carga e conferência do território, mapa com bairros, limite e escolas, lista, ficha, tabelas, quadro de qualidade, mapa resumido no Início e "Fontes e limitações" com as camadas; falta a revisão e o roteiro manual de `sdd/ep-01-territorio-escolas/qa-report.md` |
| EP-02 a EP-05 | Não iniciados |

## Pré-requisitos

- **Docker 28** com Compose (banco PostgreSQL 17 e a aplicação em container).
- **Node 22** (22.13 ou mais novo: a carga do território usa o `node:sqlite`, embutido a partir daí) e npm (comandos de desenvolvimento e testes na máquina).
- Rede no primeiro `npm install`, no `npm run build` (fonte do Google) e na primeira subida do Docker (imagens). No uso, o fundo do mapa vem do OpenStreetMap (`tile.openstreetmap.org`); sem rede o mapa continua com fundo neutro e um aviso.

## Primeiro uso

```bash
cp .env.example .env     # preencha os marcadores <...>; o .env nunca vai para o git
npm install
npx playwright install chromium   # navegador dos testes E2E (uma vez por máquina)
npm run senha:hash       # uma vez por conta de demo; cole o resultado em DEMO_*_SENHA_HASH
docker compose up --build
```

1. No `.env`, defina `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` (valores à sua escolha, só para o banco local) e o `DATABASE_URL` correspondente (host `localhost`, usado fora do Docker).
2. Defina usuário e nome das duas contas de demo e rode `npm run senha:hash` para cada senha: a senha é digitada sem eco e só o hash é impresso. Nenhuma senha é versionada nem gravada em claro.
3. `docker compose up --build` sobe o banco, aplica as migrações e inicia a aplicação em `http://localhost:3000` (porta ajustável por `APP_PORT`).
4. Confira `http://localhost:3000/api/saude`: `{"status":"ok",...}` com o banco de pé; `503` sem ele.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento em `http://localhost:3000` (precisa do banco: `docker compose up -d db`) |
| `npm run build` / `npm start` | Build de produção (`output: "standalone"`) e execução local do build |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint, TypeScript e Prettier |
| `npm test` | Jest: unidade e integração (a integração usa o banco `acarau_teste`) |
| `npm run test:related -- <arquivos>` | Só os testes ligados aos arquivos informados |
| `npm run test:ci` | Jest completo com cobertura e gate de 80% por arquivo na lógica crítica |
| `npm run test:e2e` | Playwright (Chromium) na porta 3100, banco `acarau_e2e`; exige `npm run build` antes |
| `npm run verificar` | Gate único: prepara os bancos de teste e roda `lint`, `typecheck`, `test:ci`, `build` e `test:e2e`; para na primeira falha e diz a etapa |
| `npm run dados:territorio` | Gera `dados/gerados/territorio.json` e `camadas.json` a partir dos insumos de `dados/`; falha inteira (nada é gravado) se qualquer regra da base for violada |
| `npm run dados:territorio -- --conferir` | Regenera em memória e sai com erro se o resultado diferir do versionado; é a primeira etapa do `npm run verificar` |
| `npm run db:preparar-teste` | Sobe o `db` do compose e cria/migra `acarau_teste` e `acarau_e2e` |
| `npm run db:gerar` / `npm run db:migrar` | Gera a migração a partir do schema / aplica as migrações |
| `npm run senha:hash` | Gera o hash de senha de uma conta de demo |

Antes de rodar testes de integração ou E2E, o Docker precisa estar ativo; sem ele os testes não são pulados, a execução para e avisa.

## Papéis

| Papel | Acesso |
|---|---|
| Visitante | Telas públicas: início, módulos, fontes e limitações, sobre. Não precisa de conta |
| Analista | Visitante + área do analista |
| Administrador | Analista + área de administração |

As contas são fixas, definidas no `.env` (`DEMO_ANALISTA_*` e `DEMO_ADMIN_*`); não há cadastro. A autorização é sempre conferida no servidor.

### Contas dos testes E2E

O Playwright sobe o próprio servidor (porta 3100) com contas de teste cujas senhas ficam em `tests/e2e/contas-teste.ts` e cujos hashes são gerados na hora. Elas só valem nesse servidor e **não são credenciais reais**; por isso aparecem no repositório.

## Limites da demonstração

- Não é sistema oficial da Prefeitura de Acaraú; usa dados agregados e sintéticos, sempre com a procedência indicada.
- Duas contas fixas (analista e administrador), sem cadastro nem recuperação de senha.
- Sem conexão com bancos institucionais de saúde ou de obras.
- Banco e aplicação rodam localmente; não há ambiente publicado nesta fase.

## Território e escolas (EP-01)

O Território lê dois artefatos **versionados** em `dados/gerados/` (`territorio.json`: 24 bairros, limite municipal e 62 escolas com a relação escola-bairro; `camadas.json`: o que a carga validou). Por isso um clone limpo funciona só com `npm install` e `docker compose up --build`: **nenhum passo de carga roda na subida, no build nem no deploy**.

- **Regerar** (só ao trocar a base): `npm run dados:territorio`. Os insumos da carga são três arquivos de `dados/`: `acarau_completo.gpkg`, `escolas_origem_tratada.csv` e `relatorio_validacao_bairros.csv`. As contagens esperadas (24 UVs, 58 escolas com coordenada, 62 no catálogo, 4 sem coordenada, 1 limite) ficam em `lib/territorio/validacao-carga.ts`: mudar a base é mudar a constante no mesmo commit.
- **Conferir**: `npm run dados:territorio -- --conferir` garante que os artefatos versionados são exatamente o que a carga produz hoje dos insumos versionados; reprova a entrega se alguém editar um lado sem o outro.
- **Git**: os insumos de `dados/` já estão no repositório, então o clone traz tudo que a carga lê. Arquivos **novos** em `dados/` só entram se forem os três insumos acima ou `dados/gerados/` (`.gitignore`).
- **Data de referência** das camadas: "Não informada" até haver a data do CSV do INEP e do recorte do OSM (muda só a constante da carga).

## Dados

Todos os insumos estão em `dados/` (detalhes em `dados/LEIA-ME.txt`):

- **Entrada geográfica recomendada:** `acarau_completo.gpkg` — 24 UVs da sede, 58 escolas, limite municipal, 4 distritos, 181 setores censitários e camadas do OSM (ruas, rios, corpos d'água, edificações, localidades, pontos de interesse, saúde, uso do solo).
- **Escolas:** 62 registros do INEP em `escolas_origem_tratada.csv`, 58 com coordenadas e 4 sem posição geográfica (preservar sem inventar localização).
- **Dados sintéticos:** `casos_saude_DEMO.csv` e `obras_DEMO.csv` são completamente fictícios; não devem ser usados para alegar situação real de Acaraú.
- **Atenção:** `acarau_bairros_escolas.gpkg` tem registros duplicados; `istritos_acarau_corrigido.*` e `lagoas_acarau.*` estão incompletos (sem `.shp`) e **aguardam reexportação completa pelo responsável pelos dados — não apagar nem usar até lá**; `distritos_acarau.*` cobre o Ceará inteiro. Ver "Problemas conhecidos" no LEIA-ME.
- Arquivo presente não é camada validada: a aplicação só anuncia uma camada depois de importada e validada (RN-007).

## Notas sobre as fontes

- Fonte jurídica: Lei Municipal nº 2.172/2026 (o PDF não está no repositório); 24 UVs da sede reconstruídas na camada de bairros; 29 UVs indicadas no art. 5º para o município, com categorias específicas nos demais artigos.
- Escolas: CSV do INEP; 62 registros, 58 com coordenadas.
- Camadas do OSM sob licença ODbL; manter atribuição.
- Não existe conexão autorizada com banco institucional de saúde ou dados de obras da Prefeitura.
- Não reutilize marca oficial sem autorização.

## Princípio do desenvolvimento

**Demo que funciona > telas falsas. Testes e integridade dos dados > volume de funcionalidades.**
