# GRG SPACE — mapa do catálogo local de projetos

**Host:** Windows · `C:\Users\Dell\Desktop\PROJETOS\projetos.json`  
**Coleta:** 21/10/2026 · inventário somente de leitura  
**Escopo:** metadados de catálogo, existência da pasta, versão em `package.json`, URLs e portas declaradas. Comandos de inicialização e segredos foram excluídos.

## Leitura do snapshot

- Entradas: **41**; IDs únicos: **41**.
- “PRESENTE” descreve apenas a existência do caminho no host Windows durante a coleta.
- Versão é `package.json` quando localizado; a versão declarada no catálogo aparece separada. O catálogo não declara um campo `version` em nenhuma entrada.
- UI/API indicam portas cadastradas no host local, não listeners ativos. Na amostra de listeners de 21/10/2026 21:24 BRT, nenhuma das portas declaradas pelo catálogo estava escutando. Isso é um retrato temporal, não estado contínuo.
- URLs remotas são destinos configurados no catálogo; a presença não comprova disponibilidade.
- Logos são IDs de ativos cadastrados, não status operacional.
- Para disponibilizar esse catálogo à instância GRG na VPS, é necessário parear um connector local autenticado. A VPS não consegue ler caminhos `C:\` diretamente.

## Projetos

| ID | Projeto | Papel | Modo | Caminho no host local | Pasta | Versão catálogo / pacote | Portas configuradas | URL remota configurada | Logo ID |
|---|---|---|---|---|---|---|---|---|---|
| fenix | Fênix OS | Principal | batch | `C:\projetos\ai-engine-core\ai-engine\grg` | PRESENTE | não declarada / 1.0.0 | UI 4400 · API — | — | fenix |
| mf-atacadista | MF Atacadista | Relacionado | web | `C:\Users\Dell\Documents\antigravity\charming-einstein` | PRESENTE | não declarada / 0.0.0 | UI 8181 · API — | — | — |
| zapai-crm | ZAI CRM | Principal | web | `C:\projetos\ZAPAI-FINAL` | PRESENTE | não declarada / não encontrado/não medido | UI 8080 · API 4025 | http://209.50.241.22:4025 | zapai-crm |
| zapflow-crm | ZapFlow CRM | Principal | web | `C:\Users\Dell\Downloads\projeto-b0121d7d-b6b4-40c0-ad38-492e90ac8994 (7)` | PRESENTE | não declarada / 0.0.0 | UI 8182 · API — | — | — |
| meta-save-poster | META Instagram AutoPoster | Principal | web | `C:\Users\Dell\Downloads\Insta-auto-post-main\instagram-auto-poster-ext\backend` | PRESENTE | não declarada / 3.0.0 | UI — · API 8787 | — | meta-save-poster |
| meta-autoposter-python | META AutoPoster Python | Cópia/variante | folder | `C:\Users\Dell\Downloads\autoposter_project` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | meta-save-poster |
| marmita | Marmita da Casa | não classificado | file | `C:\Users\Dell\Downloads\marmita-da-casa-v5.html` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| api-platform | API Platform (local Docker / VPS) | Principal | docker | `C:\Users\Dell\Documents\API GRATIS` | PRESENTE | não declarada / 1.0.0 | UI 8201 · API 8200 | http://209.50.241.22:8081 | api-platform |
| droidview | DroidView | Principal | web | `C:\projetos\dview` | PRESENTE | não declarada / 0.1.0 | UI 5173 · API 8205 | — | — |
| disk7 | DISK7 Discadora | não classificado | web | `C:\projetos\DISCADORA` | PRESENTE | não declarada / 1.4.25 | UI 8183 · API — | — | — |
| editor-visual | Editor Visual | não classificado | web | `C:\Users\Dell\Documents\Codex\2026-09-11\new-chat` | PRESENTE | não declarada / não encontrado/não medido | UI 3000 · API — | — | — |
| baileys-server | Baileys Server | Relacionado | web | `C:\Users\Dell\Documents\baileys-server` | PRESENTE | não declarada / 1.0.0 | UI 4000 · API — | — | — |
| scrapper-v1 | Scrapper V1 | não classificado | folder | `C:\Users\Dell\Documents\SCRAPPER - V1` | PRESENTE | não declarada / 1.0.0 | UI — · API — | — | — |
| browser-agent | Browser Agent | não classificado | folder | `C:\projetos\BROWSER INSTANCE` | PRESENTE | não declarada / 0.1.0 | UI — · API — | — | — |
| zapai-assistant | ZAI Assistant | não classificado | web | `C:\Users\Dell\Documents\antigravity\dazzling-archimedes` | PRESENTE | não declarada / 1.0.0 | UI 8184 · API — | — | — |
| wave-store | Wave Store | não classificado | web | `C:\Users\Dell\Documents\antigravity\modest-newton` | PRESENTE | não declarada / 1.0.0 | UI 8185 · API — | — | — |
| rifa-simulator | Simulador de Rifa | não classificado | folder | `C:\Users\Dell\Documents\antigravity\splendid-bardeen` | PRESENTE | não declarada / 1.0.0 | UI — · API — | — | — |
| fortlev-quote | Fortlev Quote | não classificado | web | `C:\Users\Dell\Downloads\fortlev-quote-master-main` | PRESENTE | não declarada / 0.0.0 | UI 8186 · API — | — | — |
| trustpag | TrustPag | não classificado | folder | `C:\Users\Dell\Downloads\trustpag-starter` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| zapai-crm-copia | ZAI CRM (cópia) | Cópia/variante | folder | `C:\Users\Dell\Documents\ZAPAI-FINAL-TMP` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | zapai-crm |
| droidview-copia | DroidView (cópia) | Cópia/variante | web | `C:\Users\Dell\Downloads\dview-main` | PRESENTE | não declarada / 0.1.0 | UI 5000 · API — | — | — |
| openclaw | OpenClaw | não classificado | folder | `C:\bots\openclaw` | PRESENTE | não declarada / 2026.2.4 | UI — · API — | — | — |
| hermes | Hermes Agent | não classificado | folder | `C:\Users\Dell\Documents\hermes-agent-2026.5.29.2` | PRESENTE | não declarada / 1.0.0 | UI — · API — | — | — |
| deep-live-cam | Deep Live Cam | não classificado | folder | `C:\Users\Dell\Downloads\Deep-Live-Cam-main` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| extensions | Extensões Chrome | não classificado | extensions | `C:\Users\Dell\Downloads` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| task-board | Fênix Task Board | Relacionado | command | `C:\projetos\ai-engine-core\projects\task-board` | PRESENTE | não declarada / 1.0.0 | UI 4500 · API — | — | fenix |
| api-platform-hub | API Platform Provider Hub | Cópia/variante | folder | `C:\projetos\ai-engine-core\api-platform-provider-hub` | PRESENTE | não declarada / 1.0.0 | UI — · API — | — | api-platform |
| api-platform-deploy | API Platform Deploy | Cópia/variante | folder | `C:\projetos\ai-engine-core\api-platform-deploy` | PRESENTE | não declarada / 1.0.0 | UI — · API — | — | api-platform |
| api-platform-fenix | API Platform Fênix | Cópia/variante | folder | `C:\projetos\ai-engine-core\projects\API-PLATAFORM` | PRESENTE | não declarada / 1.0.0 | UI — · API — | — | api-platform |
| save-poster-v2 | Save Poster V2 | Cópia/variante | folder | `C:\Users\Dell\Downloads\SAVE-POSTER-FINAL-V2` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | meta-save-poster |
| gerar-ficha | Gerar Ficha | não classificado | batch | `C:\Users\Dell\Documents\GERAR FICHA` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | http://209.50.241.22:8000 | — |
| ocbot | OCBOT WhatsApp | Relacionado | docker | `C:\whatsapp-bot\ocbot` | PRESENTE | não declarada / não encontrado/não medido | UI 8202 · API 8203 | — | — |
| whatsapp-saas | WhatsApp SaaS | Relacionado | folder | `C:\whatsapp-bot\ai-whatsapp-saas` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| zapflow-html | ZapFlow CRM HTML | Cópia/variante | file | `C:\Users\Dell\Documents\ZAPAI PRINTS - HTML\ZAPFLOW AI - CRM Operacional.html` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| rolezando | Rolezando Android | não classificado | folder | `C:\Users\Dell\Documents\Rolezando` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| ram-pc | RAM PC | não classificado | folder | `C:\Users\Dell\Documents\RAM PC` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| api-gratis-backup | API Platform Backup | Cópia/variante | folder | `C:\Users\Dell\Documents\API GRATIS-backup-20260908-194431` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | api-platform |
| save-poster-pro-v2 | Save Poster Pro V2 | Cópia/variante | folder | `C:\Users\Dell\Downloads\SAVE-POSTER-FINAL-V2 (3)` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | meta-save-poster |
| fb-auto-post | Facebook Auto Post | não classificado | extensions | `C:\Users\Dell\Downloads\fb-auto-post-pro` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |
| emailcontrol | IUS Email Control | Principal | web | `C:\Users\Dell\Downloads\stitch_email_control_enterprise_platform\stitch_email_control_enterprise_platform` | PRESENTE | não declarada / 1.0.0 | UI 1000 · API — | — | — |
| avatarify | Avatarify Python | Projeto local | folder | `C:\Users\Dell\Desktop\avatarify-python-master` | PRESENTE | não declarada / não encontrado/não medido | UI — · API — | — | — |

## Pendências para o Project Hub

1. Implementar pareamento revogável entre o GRG remoto e um serviço local no Windows, limitado a raízes escolhidas pelo usuário.
2. Separar visualmente `configurado`, `listener observado`, `health verificado` e `indisponível` com timestamp e host.
3. Abrir pastas e IDE através do connector local; a VPS deve continuar sem acesso direto a arquivos locais.
4. Usar `logoId` apenas quando o ativo correspondente for servido pelo connector ou catálogo autorizado.
5. Medir portas novamente no momento da consulta antes de oferecer “Abrir sistema”.
