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
| EP-02 Importação CSV e motor analítico | Implementado (`sdd/ep-02-importacao-analises/tasks.md`): importação de CSV por assistente, datasets versionados e publicáveis, Saúde com coroplético, ranking, tabela e gráfico por período, dataset pré-carregado, reset e datasets em "Fontes e limitações"; falta a revisão e o roteiro manual de `sdd/ep-02-importacao-analises/qa-report.md` |
| EP-03 Saúde e Educação | Implementado (`sdd/ep-03-saude-educacao/tasks.md`): Saúde com cards e variação, seletor de bairro, abas Mapa e Tabela e metodologia; página Educação com cards, mapa, tabela por bairro, lista com busca, ficha e pendências; mapa dividido em módulos por conceito; falta a revisão e o roteiro manual de `sdd/ep-03-saude-educacao/qa-report.md` |
| EP-04 Obras | Implementado (`sdd/ep-04-obras/tasks.md`): página Obras com resumo, filtros por situação e bairro, mapa, lista, ficha com histórico e metodologia; cadastro e edição pelo analista com o ponto no mapa ou por coordenadas; 8 obras de exemplo, reset estendido, atalho na Área do analista e obras em "Fontes e limitações"; falta a revisão e o roteiro manual de `sdd/ep-04-obras/qa-report.md` |
| EP-05 Relatório, exportações, auditoria e publicação | Em andamento (`sdd/ep-05-relatorios-deploy/tasks.md`) |

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
| `npm run demo:semear` | Grava o dataset e as 8 obras de exemplo que ainda não existem (idempotente; sai com 1 se falhar). Usado pelo job `publicar`; usa o `DATABASE_URL` do ambiente |
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
- Banco e aplicação rodam localmente com o Docker; o ambiente publicado (Vercel + Neon, plano gratuito) segue a seção "Publicação".

## Território e escolas (EP-01)

O Território lê dois artefatos **versionados** em `dados/gerados/` (`territorio.json`: 24 bairros, limite municipal e 62 escolas com a relação escola-bairro; `camadas.json`: o que a carga validou). Por isso um clone limpo funciona só com `npm install` e `docker compose up --build`: **nenhum passo de carga roda na subida, no build nem no deploy**.

- **Regerar** (só ao trocar a base): `npm run dados:territorio`. Os insumos da carga são três arquivos de `dados/`: `acarau_completo.gpkg`, `escolas_origem_tratada.csv` e `relatorio_validacao_bairros.csv`. As contagens esperadas (24 UVs, 58 escolas com coordenada, 62 no catálogo, 4 sem coordenada, 1 limite) ficam em `lib/territorio/validacao-carga.ts`: mudar a base é mudar a constante no mesmo commit.
- **Conferir**: `npm run dados:territorio -- --conferir` garante que os artefatos versionados são exatamente o que a carga produz hoje dos insumos versionados; reprova a entrega se alguém editar um lado sem o outro.
- **Git**: os insumos de `dados/` já estão no repositório, então o clone traz tudo que a carga lê. Arquivos **novos** em `dados/` só entram se forem os três insumos acima ou `dados/gerados/` (`.gitignore`).
- **Data de referência** das camadas: "Não informada" até haver a data do CSV do INEP e do recorte do OSM (muda só a constante da carga).

## Importação de CSV e Saúde (EP-02)

O analista (ou o administrador) importa contagens de saúde por bairro e período em **Saúde > Importar CSV** (`/saude/importar`). O assistente lê e valida o arquivo **no navegador** a cada passo (separador, colunas, bairros, validação) com o mesmo motor que o servidor roda de novo ao confirmar; nada é gravado antes da confirmação e cancelar só descarta o estado da tela.

- **Regras do arquivo:** `.csv` em UTF-8, até 4 MB e 10.000 linhas, com vírgula ou ponto e vírgula; só contagens agregadas (cabeçalho ou célula com cara de dado pessoal, como `nome_paciente` ou um CPF, recusam o arquivo). O mesmo conteúdo nunca é importado duas vezes (SHA-256 dos bytes).
- **Versões:** um dataset novo ou uma nova versão de um existente nasce **privada**; **Publicar** é ação explícita (`/saude/datasets`), e publicar uma versão despublica a outra do mesmo dataset. O visitante só vê o publicado.
- **Saúde:** quatro cards no topo (total com variação contra o período anterior, bairros com dados, sem dados e fora da cobertura), seletor de bairro com busca, abas Mapa (coroplético por quantis, até 5 classes, e legenda) e Tabela (os 24 bairros), ranking, gráfico por período e a seção recolhível "Como os números são calculados". Taxa não é calculada (a demonstração não tem população por bairro); a explicação fica na metodologia.
- **Dados de exemplo (`dados/sinteticos/`):** `saude-roteiro_DEMO.csv` (roteiro de importação, com um bairro ambíguo e outro não reconhecido), `adversos/` (um arquivo ruim por motivo de recusa) e `saude-pre-carregado_DEMO.csv`. O `LEIA-ME.txt` da pasta explica cada um.
- **Pré-carregado e reset:** na subida o servidor grava e publica `saude-pre-carregado_DEMO.csv` se ele ainda não existe (pelo mesmo motor da importação; uma falha vai para o log e não derruba a subida). Em **Administração > Reiniciar a demonstração** o administrador apaga todos os datasets importados e restaura esse. O território nunca é tocado. A imagem do Docker copia só esse CSV (o `.dockerignore` exclui o resto de `dados/`) e o servidor o lê a partir do diretório de execução (`/app`).
- **Testes que gravam dados:** o banco do E2E acumula entre execuções e o hash é único, então todo spec da Saúde começa com `reiniciarDemo()` (`tests/e2e/acesso-helpers.ts`).

## Educação (EP-03)

`/educacao` é pública (sem sessão e sem nenhuma ação de escrita) e lê o mesmo `territorio.json` do EP-01: os números vêm de `qualidade` e de `totalEscolas`, sem recontar. A tela mostra os cinco cards (62 registros, 58 georreferenciadas, 4 sem localização, 24 dentro dos bairros e 33 fora da cobertura, com a escola fora do limite citada à parte), o mapa com as escolas, a tabela de escolas por bairro com as linhas fora da soma, a lista com busca por nome ou código INEP e filtros, a ficha da escola num painel lateral, as pendências de qualidade e a metodologia.

- **Bairro entre módulos:** o seletor de bairro escreve o mesmo filtro `bairro` da URL que a Saúde e o Território; o `periodo` não se aplica à Educação e é preservado ao navegar.
- **Contagem:** no artefato, `qualidade.foraDaCobertura` (34) já inclui a escola fora do limite; a Educação a separa (33 + 1) para as quatro categorias somarem 62.
- **Fonte e data:** vêm da camada `escolas` de "Fontes e limitações"; sem ela a página mostra "Fonte ausente" em vez de números.

## Obras (EP-04)

`/obras` é pública para leitura e mostra todas as obras sintéticas: faixa de dados fictícios, resumo por situação (total, as quatro situações e as sem localização), filtros por situação (chips) e bairro, mapa com um marcador por obra com ponto (forma diferente por situação), lista rolável, ficha com histórico de situação e a metodologia. O analista e o administrador veem "Nova obra" e "Editar": o formulário fica na coluna ao lado do mapa, para o clique no mapa preencher latitude e longitude; o bairro é calculado pelo servidor a partir do ponto (a prévia usa a mesma regra) e ponto fora do município não é aceito.

- **Leitura e escrita:** a página lê as obras no servidor, sem `GET`; a escrita é só `POST /api/obras` e `PUT /api/obras/{id}`, com auditoria no log. Não há exclusão: só o reset remove obras. O teto da demo é de 200 obras.
- **Obras de exemplo:** `dados/sinteticos/obras-pre-carregadas_DEMO.json` (8 obras com histórico e datas fixas) é gravado na subida e no reset, na mesma transação dos datasets. A imagem do Docker copia esse JSON. O `obras_DEMO.csv` da pasta `dados/` não é usado.
- **Atalho:** a Área do analista leva a `/obras?nova=1`, que abre o formulário (só para quem pode editar).
- **Testes que gravam obras:** todo spec que cria ou edita obra começa com `reiniciarDemo()`; `inserirObras(n)` (`tests/e2e/banco-e2e.ts`) monta o caso de 200 obras.

## Publicação

A demonstração publicada roda na **Vercel (plano Hobby)** com **Postgres do Neon (nível gratuito, região São Paulo)**. Quem publica é o **GitHub Actions** (`.github/workflows/verificar-e-publicar.yml`): a integração Git da Vercel fica desligada (`vercel.json`). O `docker compose` continua sendo o ambiente de desenvolvimento e de testes.

| Evento | O que roda |
|---|---|
| Push ou pull request em qualquer ramo | Só o job `verificar`: `npm run verificar` com um `.env` fictício (`scripts/preparar-env-ci.mjs`), sem nenhum segredo |
| Push na `main` com o `verificar` verde | Job `publicar` (environment `producao`): migração e `demo:semear` pela URL direta do Neon, depois `vercel build --prod` e `vercel deploy --prebuilt --prod` |
| `verificar` vermelho ou qualquer passo do `publicar` falhando | Nada é publicado; a versão anterior segue no ar |

### Montar o ambiente (uma vez, por quem tem as contas)

1. **Neon:** crie o projeto pelo marketplace da Vercel, região São Paulo. Guarde duas URLs: a **do pooler** (host com `-pooler`) para a aplicação e a **direta** para migração, semeadura e backup.
2. **Vercel:** crie o projeto **sem conectar o repositório** (ou desligue a integração Git). Anote `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` (arquivo `.vercel/project.json` depois de `npx vercel link`) e crie um token (`VERCEL_TOKEN`).
3. **Variáveis do projeto na Vercel (Production):**

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | URL **do pooler** do Neon |
   | `DB_POOL_MAX` | `3` |
   | `PRE_CARREGAR_NA_SUBIDA` | `false` (a carga do exemplo é do `demo:semear`) |
   | `APP_URL` | `https://<projeto>.vercel.app` (https liga o cookie `Secure`) |
   | `DEMO_ANALISTA_USUARIO`, `DEMO_ANALISTA_NOME`, `DEMO_ANALISTA_SENHA_HASH` | Conta de analista (hash por `npm run senha:hash`) |
   | `DEMO_ADMIN_USUARIO`, `DEMO_ADMIN_NOME`, `DEMO_ADMIN_SENHA_HASH` | Conta de administrador |

4. **GitHub:** crie o environment `producao` (Settings, Environments) com os segredos `DATABASE_URL_DIRETA`, `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`. Nenhum desses valores entra no repositório nem no `.env.example`.
5. Faça o merge na `main` e acompanhe a aba Actions. Depois da primeira publicação, confira `https://<projeto>.vercel.app/api/saude` (`"status":"ok"`) e a região das funções (`gru1`) no painel; se a região não estiver disponível no Hobby, crie o banco na mesma região da função.

### Trocar a senha de uma conta

Gere o novo hash (`npm run senha:hash`), troque `DEMO_*_SENHA_HASH` nas variáveis da Vercel e publique de novo (reexecute o job `publicar` ou faça um push na `main`). Sem mudança de código: a impressão da credencial muda e as sessões antigas deixam de valer.

### Backup e restauração

```bash
# backup (URL direta do Neon; o arquivo traz dados e estrutura)
pg_dump -Fc "$DATABASE_URL_DIRETA" -f acarau-backup.dump

# restauração num banco do compose, para conferir (docker compose up -d db)
docker compose exec -T db createdb -U "$POSTGRES_USER" acarau_restaurado
docker compose exec -T db pg_restore -U "$POSTGRES_USER" -d acarau_restaurado --no-owner < acarau-backup.dump
```

Para abrir a aplicação local sobre o banco restaurado, aponte `DATABASE_URL` para `acarau_restaurado` e rode `npm run dev`. Os mesmos datasets, obras e eventos de auditoria devem aparecer.

### Limites do plano gratuito

- **Hobby da Vercel:** uso pessoal e não comercial nos termos do plano; para uso comercial é preciso migrar de plano (Pro). Corpo de requisição de até 4,5 MB, por isso o upload de CSV é limitado a **4 MB** em todo ambiente. Logs com retenção curta: o "quem fez o quê" fica na auditoria do banco.
- **Neon gratuito:** o banco "dorme" sem uso e o primeiro acesso demora alguns segundos; há limite de armazenamento e de horas de computação por mês.
- **GitHub Actions:** gratuito no repositório, com limite mensal de minutos em repositório privado.
- **Antes de uma reunião:** abra `/api/saude` e a página Início cerca de 5 minutos antes, para acordar o banco e aquecer a função.

### Migrar de plano (se o Hobby deixar de servir)

Crie o projeto no plano pago, repita os passos de "Montar o ambiente" com as novas credenciais e atualize os segredos do environment `producao`. Nada no código muda.

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
