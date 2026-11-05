# GRG SPACE — mapa de projetos e ambientes

Atualizado em 21/10/2026 com a sessão autenticada do Project Hub e uma leitura somente de leitura da VPS. Este documento distingue cadastro/configuração de disponibilidade medida.

## Entradas confirmadas

| Ambiente | Serviço | Endereço observado | Evidência | Limite atual |
|---|---|---|---|---|
| VPS | GRG SPACE / Fênix web | `https://209.50.241.22/app` e `http://209.50.241.22:3000/app` | HTTP 200 e título GRG SPACE | `/` abre login GRG; não redireciona diretamente para `/app` |
| VPS | API Platform | `209.50.241.22:3001` (`/health`) | HTTP 200; container API Platform | A dashboard usa `:8081`; identidade e rotas privadas exigem sessão |
| VPS | API Platform dashboard | `209.50.241.22:8081` | Container em execução na leitura | Health/autenticação da dashboard não foram medidos nesta rodada |
| VPS | ZAI CRM | `https://209.50.241.22:1000` | HTTPS 200 e título ZAI; HTTP puro retorna 400 por ser porta TLS | Backend `:4025` saudável em loopback, mas acesso externo expirou; disponibilidade externa pendente |
| VPS | Fênix backend | `127.0.0.1:4410` | `/health` 200 no próprio host | Limitado a loopback; owner exato do processo e proxy direto não confirmados |
| VPS | Gerar Ficha | `209.50.241.22:8000` | `/health` 200, versão informada `1.1.0` | A página/fluxo autenticado não foi exercitado nesta leitura |
| PC Windows | Catálogo `Desktop\PROJETOS` | 41 entradas no `projetos.json`; pastas listadas existem | Inspeção do catálogo local | Só é legível no host Windows que contém a pasta; a VPS não pode ler `C:\Users\Dell\Desktop\PROJETOS` |

## Portas reservadas observadas na VPS

| Porta | Serviço observado | Ação de roteamento |
|---:|---|---|
| 80/443 | OpenResty TLS/reverse proxy | Preservar; `/` entrega login GRG e `/app` entrega o Fênix |
| 3000 | Frontend Fênix/GRG SPACE | Preservar; não é o AI Engine Core frontend apesar de conflito no catálogo |
| 3001 | API Platform | Preservar |
| 1000 | ZAI CRM via TLS | Preservar |
| 4025 | API ZAI | Preservar; disponibilidade externa pendente |
| 4410 | Backend Fênix em loopback | Preservar; não expor diretamente sem revisão de segurança |
| 8000 | Gerar Ficha | Preservar |
| 8081 | Dashboard API Platform | Preservar |

## Lacunas de integração Windows/VPS

- O Project Hub autenticado atualmente lista 7 projetos: Fênix OS, ZapAI CRM, API Platform, AI Engine Core, MF Atacadista, DroidView MDM e Task Board Ops. Essa lista é o catálogo do kernel na VPS, não uma prova de que os 41 projetos locais estão disponíveis no servidor.
- O launcher Windows informa papéis “Principal” e “Cópia/variante”, mas não tem versão de software para as entradas auditadas. O Project Hub deve mostrar “versão não informada” em vez de inferir versão do papel.
- O catálogo local existente só lê `projetos.json` no host do processo. Para a VPS mostrar/abrir pastas locais, é necessário um agente Windows online, autenticado e com confirmação verificável da abertura. O backend não deve anunciar “aberto” apenas porque despachou a solicitação.
- `logoId` tem apenas 4 valores únicos para as entradas auditadas, apesar de haver mais arquivos de logo. Logos podem ser reutilizados pelo catálogo; logo único por projeto não está comprovado.
- Os checks de saúde e portas são medições da VPS no momento da auditoria; URLs e portas gravadas no launcher são configurações e não devem aparecer como “online” sem check com timestamp.

## Próximo recorte de implementação

1. No catálogo, explicitar origem do projeto: `Windows local`, `VPS workspace` ou `GitHub`, além do caminho/URL e timestamp do último health check real.
2. Mostrar versões e logos ausentes como estados não informados, sem placeholders que pareçam medidos.
3. Separar “Abrir no PC” de “Abrir workspace VPS”; só concluir a primeira ação com ACK do agente Windows identificado e autenticação válida.
4. Validar isolamento por tenant em `/api/v2/projects-registry`; a leitura atual confirmou 401 sem sessão, mas não verificou autorização entre tenants.
5. Não alterar portas nem publicar mudanças de proxy até identificar o processo root que atende `:3000` e guardar configuração restaurável.
