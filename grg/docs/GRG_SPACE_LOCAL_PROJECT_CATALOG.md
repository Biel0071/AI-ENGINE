# Catálogo local PROJETOS → Fênix

## Inventário observado

Em 20/10/2026, `C:\Users\Dell\Desktop\PROJETOS` contém 41 itens em `projetos.json`, 41 atalhos `.lnk`, scripts de inicialização e validação, diretórios de logos/logs e os mapas `MAPA-PROJETOS.md` e `ANALISE-PROJETOS.md`. Os 41 caminhos declarados no catálogo existem nesta máquina. Os projetos estão agrupados por produto/família; 19 entradas abrem pastas, 13 são serviços web, 2 Docker, 2 executáveis por lote, 2 arquivos, 2 extensões e 1 comando dedicado.

O diretório é o catálogo e launcher, não a raiz dos códigos de cada projeto. Cada registro em `projetos.json` aponta para outra pasta ou arquivo. `Iniciar-Projeto.ps1` agrupa variantes, mostra metadados Git e, para serviços, confere a identidade da resposta antes de abrir a URL. O script não deve ser executado pelo servidor web remoto.

## Integração existente no Fênix

O Project Hub usa `GET /api/fenix/projects` e mostra o Project Kernel, Screen DNA, Project Absorption e Page Registry. A nova aba **Telas & DNA** reúne fontes existentes para comparação e abre o projeto selecionado na aba Screen DNA.

O catálogo `C:\Users\Dell\Desktop\PROJETOS\projetos.json` agora pode ser lido pelo Project Kernel quando o Fênix roda nesta máquina. O Project Hub mostra os registros numa aba separada **Meus Projetos**, pesquisa por nome, caminho, grupo e tipo, abre a IDE/Screen DNA e permite abrir manualmente uma `localUrl` declarada. Cada entrada usa o ID `local-<id-do-catálogo>` e mantém o ID original em `catalogId`, para não colidir com os projetos canônicos. O parser aceita BOM UTF-8, comum em arquivos salvos pelo Windows. Configure outro caminho com `FENIX_LOCAL_PROJECT_CATALOG`; sem configuração, o servidor local procura `~/Desktop/PROJETOS/projetos.json`. Testes não fazem essa descoberta automática.

Os atalhos e campos `command` do catálogo não são enviados à interface nem executados. As pastas são listadas pela IDE após autorização `project:read`. Para itens que apontam a um arquivo individual, a árvore e o endpoint de leitura expõem apenas aquele arquivo; absorção/mapa de pasta fica desabilitado para não varrer a pasta de projetos vizinha. Caminhos inexistentes permanecem visíveis com status indisponível.

Na aba **Telas & DNA**, continua possível buscar por nome/rota/arquivo, filtrar captura atual, captura histórica e telas ainda sem captura, abrir registros no Inspector e expandir todas as telas de um projeto. As contagens distinguem telas registradas de imagens e de registros não medidos.

## Limite de acesso e próximo elo

A conexão direta funciona quando o backend do Fênix está rodando na máquina que contém o catálogo. A página hospedada em `http://209.50.241.22:3000` executa no navegador do usuário, mas as rotas de arquivo executam na VPS; ela não consegue ler `C:\Users\Dell\Desktop\PROJETOS` nem os projetos desse disco. O catálogo não deve ser replicado como caminho Windows no runtime remoto.

Para abrir e ler projetos da pasta Desktop diretamente pela página na VPS ainda é necessário um elo local autenticado que:

1. leia o catálogo local e exponha apenas metadados permitidos;
2. confirme a identidade do projeto antes de conectar uma workspace;
3. libere leitura/escrita somente nas raízes selecionadas, usando as mesmas permissões e revisão de diff da IDE;
4. ofereça ao Fênix remoto uma conexão autenticada e reversível, sem publicar segredos nem deixar uma porta de filesystem aberta.

Enquanto esse elo não existir, o Fênix mostra apenas projetos e telas que o runtime conectado realmente consegue acessar. Não afirma que um projeto do catálogo desktop foi importado, mapeado ou aberto.
